import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Hook que maneja el cierre de sesión por inactividad tras 15 min.
const useInactivityTimer = (timeoutMs = 900000) => {
    // este redirige al usuario a otra pantalla
    const navigate = useNavigate();
    // Usamos el logout de tu contexto actual para limpiar la sesión global de React
    const { logout: authLogout } = useAuth();

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>; // Variable para guardar el identificador del cronómetro

        // Función principal que ejecuta el cierre de sesión
        const logout = async () => {
            // se revisa si hay un token guardado en el navegador
            const token = localStorage.getItem('token');
            
            // en caso de que lo haya, destruye la sesión de Redis
            if (token) {
                try {
                    await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                } catch (err) {
                    console.error("Error al hacer petición de logout al backend:", err);
                }
            }
            
            // Limpiamos tu AuthContext y el token
            localStorage.removeItem('token');
            authLogout(); 
            navigate('/login');
        };

        const resetTimer = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(logout, timeoutMs);
        };

        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keypress', resetTimer);

        resetTimer(); 

        return () => {
            clearTimeout(timer);
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keypress', resetTimer);
        };
        
    }, [navigate, timeoutMs, authLogout]); 
};

export default useInactivityTimer;