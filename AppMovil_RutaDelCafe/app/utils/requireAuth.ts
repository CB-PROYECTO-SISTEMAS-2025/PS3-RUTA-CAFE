// app/utils/requireAuth.ts
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href, Router } from 'expo-router';

/**
 * Verifica si hay sesión; si no, muestra un modal con CTA a login.
 * @param r      router de expo-router (pásalo desde tu screen)
 * @param opts   opciones (mensaje y ruta de redirección)
 * @returns      true si hay token (autenticado), false si no
 */
export async function requireAuth(
  r: Router,
  opts?: {
    message?: string;
    redirectTo?: Href;           // default: '/login'
    onCancel?: () => void;
  }
): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (token) return true;

    const LOGIN_ROUTE: Href = opts?.redirectTo ?? ('/login' as Href);

    Alert.alert(
      'Requiere iniciar sesión',
      opts?.message ?? 'Debes iniciar sesión para realizar esta acción.',
      [
        { text: 'Cancelar', style: 'cancel', onPress: opts?.onCancel },
        { text: 'Iniciar sesión', onPress: () => r.push(LOGIN_ROUTE) },
        // Otra opción sin tipado estricto:
        // { text: 'Iniciar sesión', onPress: () => r.push({ pathname: '/login' }) },
      ],
    );

    return false;
  } catch {
    // si algo falla, forzamos login por seguridad
    const LOGIN_ROUTE: Href = '/login';
    r.push(LOGIN_ROUTE);
    return false;
  }
}
