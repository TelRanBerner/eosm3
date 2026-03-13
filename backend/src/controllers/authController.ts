/**
 * Контроллер аутентификации
 * 
 * Использует JWT (access + refresh) через httpOnly cookies
 */

import { Response, Request } from 'express';
import User from '../models/User';
import { handleValidationErrors } from '@/utils';
import { sendSuccess, sendCreated, sendUnauthorized, handleError } from '@/utils';
import { SafeUser } from '@/types';
import { generateRefreshJti, signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/jwtUtils';
import { blacklistRefreshJti, isRefreshJtiBlacklisted } from '@/utils/refreshTokenBlacklist';

const ACCESS_COOKIE_NAME = 'accessToken';
const REFRESH_COOKIE_NAME = 'refreshToken';

const getCookieOptions = () => {
  const isProd = process.env['NODE_ENV'] === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' as const : 'strict' as const,
    path: '/',
  };
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  const common = getCookieOptions();
  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    ...common,
    maxAge: 15 * 60 * 1000
  });
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...common,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

const clearAuthCookies = (res: Response): void => {
  const common = getCookieOptions();
  res.clearCookie(ACCESS_COOKIE_NAME, common);
  res.clearCookie(REFRESH_COOKIE_NAME, common);
};

/**
 * Регистрация нового пользователя
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!handleValidationErrors(req, res)) return;

    const { username, email, password, role } = req.body;

    // Проверка существования пользователя
    const existingUserModel = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUserModel) {
      return sendUnauthorized(res, 'Пользователь с таким email или именем уже существует');
    }

    // Создание нового пользователя
    const user = new User({
      username,
      email,
      password, // Будет захеширован в pre-save middleware
      role: role || 'user'
    });

    await user.save();

    const refreshJti = generateRefreshJti();
    const accessToken = signAccessToken(user._id.toString(), user.role);
    const refreshToken = signRefreshToken(user._id.toString(), refreshJti);
    setAuthCookies(res, accessToken, refreshToken);

    console.log(`[AUTH] register: ${username}`);

    return sendCreated(res, {
      user: user.toSafeObject() as SafeUser,
      authenticated: true
    }, 'Регистрация успешна');

  } catch (error) {
    handleError(res, error as Error, 'Ошибка регистрации:', 'Ошибка сервера при регистрации');
  }
};


export const getUsers = async (_req: Request, res: Response) => {
  try {
    // Импортируй модель User (обычно из @/models/User)
    const users = await User.find().select('-password'); // Исключаем пароли из выдачи

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении пользователей'
    });
  }
};





/**
 * Вход пользователя
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!handleValidationErrors(req, res)) return;

    const { email, password } = req.body;

    // Поиск пользователя с паролем
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return sendUnauthorized(res, 'Неверный email или пароль');
    }

    // Проверка активности пользователя
    if (!user.isActive) {
      return sendUnauthorized(res, 'Аккаунт деактивирован');
    }

    // Проверка пароля
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return sendUnauthorized(res, 'Неверный email или пароль');
    }

    // Обновление времени последнего входа
    user.lastLogin = new Date();
    await user.save();

    const refreshJti = generateRefreshJti();
    const accessToken = signAccessToken(user._id.toString(), user.role);
    const refreshToken = signRefreshToken(user._id.toString(), refreshJti);
    setAuthCookies(res, accessToken, refreshToken);

    console.log(`[AUTH] login: ${user.username}`);

    return sendSuccess(res, {
      user: user.toSafeObject() as SafeUser,
      authenticated: true
    }, 'Вход успешен');

  } catch (error) {
    handleError(res, error as Error, 'Ошибка входа:', 'Ошибка сервера при входе');
  }
};

/**
 * Обновление access токена по refresh токену
 * POST /api/auth/refresh
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = (req as any).cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (!refreshToken) {
      clearAuthCookies(res);
      return sendUnauthorized(res, 'Refresh token отсутствует');
    }

    const payload = verifyRefreshToken(refreshToken);

    if (await isRefreshJtiBlacklisted(payload.jti)) {
      clearAuthCookies(res);
      return sendUnauthorized(res, 'Refresh token недействителен');
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      clearAuthCookies(res);
      return sendUnauthorized(res, 'User not found or deactivated');
    }

    // Ротация refresh: старый jti в blacklist до exp
    if (payload.exp) {
      await blacklistRefreshJti(payload.jti, payload.exp);
    }

    const newRefreshJti = generateRefreshJti();
    const newAccessToken = signAccessToken(user._id.toString(), user.role);
    const newRefreshToken = signRefreshToken(user._id.toString(), newRefreshJti);
    setAuthCookies(res, newAccessToken, newRefreshToken);

    return sendSuccess(res, { authenticated: true }, 'Токены обновлены');
  } catch (error) {
    clearAuthCookies(res);
    return sendUnauthorized(res, 'Refresh token недействителен');
  }
};

/**
 * Выход пользователя
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = (req as any).cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        if (payload.exp) {
          await blacklistRefreshJti(payload.jti, payload.exp);
        }
      } catch {
        // ignore invalid refresh token
      }
    }

    clearAuthCookies(res);
    console.log('[AUTH] logout');
    return sendSuccess(res, { authenticated: false }, 'Выход выполнен успешно');
  } catch (error) {
    handleError(res, error as Error, 'Ошибка выхода:', 'Ошибка сервера при выходе');
  }
};

/**
 * Проверка статуса аутентификации
 * GET /api/auth/status
 */
export const getStatus = (req: Request, res: Response): void => {
  const hasAccessCookie = Boolean((req as any).cookies?.[ACCESS_COOKIE_NAME]);
  return sendSuccess(res, {
    authenticated: hasAccessCookie
  });
};

/**
 * Получение данных текущего пользователя
 * GET /api/auth/me
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    // getMe должен вызываться только после middleware authenticate
    const user = (req as any).user;
    if (!user) {
      return sendUnauthorized(res);
    }

    return sendSuccess(res, { user: (user as any).toSafeObject() as SafeUser });
  } catch (error) {
    handleError(res, error as Error, 'Ошибка получения данных пользователя:', 'Ошибка сервера');
  }
};
