/**
 * Utility to map Firebase and other error codes to friendly Spanish messages.
 */
export const getFriendlyErrorMessage = (error: any): string => {
    const code = error?.code || "unknown";
    const message = error?.message || "";

    console.error("Error detected:", code, message);

    switch (code) {
        // Auth Errors
        case "auth/email-already-in-use":
            return "El correo electrónico ya está en uso por otra cuenta.";
        case "auth/invalid-email":
            return "El correo electrónico no es válido.";
        case "auth/user-disabled":
            return "Esta cuenta ha sido deshabilitada.";
        case "auth/user-not-found":
            return "No se encontró ninguna cuenta con este correo.";
        case "auth/wrong-password":
            return "La contraseña es incorrecta.";
        case "auth/invalid-credential":
            return "Las credenciales son inválidas o han expirado.";
        case "auth/weak-password":
            return "La contraseña es muy débil. Debe tener al menos 6 caracteres.";
        case "auth/operation-not-allowed":
            return "Esta operación no está permitida. Contacte a soporte.";
        case "auth/too-many-requests":
            return "Demasiados intentos fallidos. Por favor intente más tarde.";
        case "auth/network-request-failed":
            return "Error de conexión. Verifique su internet.";

        // Firestore Errors
        case "permission-denied":
            return "No tienes permisos para realizar esta acción.";
        case "unavailable":
            return "El servicio no está disponible temporalmente.";

        // Custom/Generic Errors
        default:
            if (message.includes("RUT")) return message; // Pass through custom RUT errors
            return "Ocurrió un error inesperado. Por favor intente nuevamente.";
    }
};
