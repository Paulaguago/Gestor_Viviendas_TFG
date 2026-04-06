const getUserFriendlyErrorMessage = (error) => {
    // Si no hay error, mostrar mensaje genérico
    if (!error) return 'Ha ocurrido un error inesperado al procesar tu solicitud. Por favor, inténtalo de nuevo más tarde.';

    const errorString = error.message || error.toString();
    const lowerError = errorString.toLowerCase();
    
    // Errores de Validación de Sequelize
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      const messages = error.errors.map(err => err.message).join(', ');
      return `Los datos introducidos no cumplen con los requisitos: ${messages}`;
    }
    
    // Errores de Fechas SQL/JS
    if (lowerError.includes('incorrect date value') || lowerError.includes('invalid date') || lowerError.includes('invalid time')) {
      if (lowerError.includes('fecha_registro')) {
        return 'La fecha de registro no puede estar vacía o es inválida. Por favor, especifica una fecha correcta.';
      }
      return 'La fecha o la hora introducida no tiene un formato válido. Por favor, revisa los calendarios desplegables y corrige el formato.';
    }
    
    // Errores de Restricciones (Claves Foráneas, Duplicate Entry) MySQL/Sequelize
    if (lowerError.includes('foreign key constraint') || lowerError.includes('er_row_is_referenced') || lowerError.includes('er_no_referenced_row')) {
      return 'No se puede realizar esta operación porque la información está en uso o vinculada a otros datos del sistema (por ejemplo, reservas o finanzas asociadas).';
    }
    if (lowerError.includes('duplicate entry') || lowerError.includes('er_dup_entry')) {
      return 'Ya existe un elemento guardado con esa misma información. Por favor, usa datos diferentes para evitar duplicados.';
    }
    
    // Errores Numéricos y de Tipo
    if (lowerError.includes('out of range') || lowerError.includes('data truncation')) {
      return 'Algún valor numérico o de texto sobrepasa el límite permitido para su campo. Por favor, revisa los importes o longitudes introducidas.';
    }
    if (lowerError.includes('incorrect integer value') || lowerError.includes('incorrect double value') || lowerError.includes('out of bounds')) {
      return 'Se ha introducido texto donde el sistema esperaba un número. Asegúrate de escribir únicamente cifras en los importes o capacidades.';
    }

    // Errores de Base de datos globales (Connection, Timeout, Syntax en queries internos)
    if (lowerError.includes('econnrefused') || lowerError.includes('timeout') || lowerError.includes('enotfound') || lowerError.includes('deadlock')) {
      return 'El servidor está experimentando problemas de conectividad intermitentes. Por favor, espera un segundo e inténtalo de nuevo.';
    }
    
    // Errores de sintaxis interna (SQL o JS no intencionados que llegan al cliente)
    if (lowerError.includes('sql syntax') || lowerError.includes('undefined is not a function') || lowerError.includes('cannot read properties of undefined')) {
        return 'Hemos encontrado un error técnico procesando esta tarea. El equipo de soporte será notificado. Por favor, actualiza la página e inténtalo nuevamente.';
    }

    // Auth o Sesión
    if (lowerError.includes('jwt expired') || lowerError.includes('jwt malformed') || lowerError.includes('unauthorized')) {
      return 'Tu sesión es inválida o ha terminado. Por seguridad, por favor vuelve a iniciar sesión.';
    }

    // JSON Parse errors de la petición del cliente o respuestas de API
    if (lowerError.includes('unexpected token') && lowerError.includes('json')) {
      return 'La información enviada no ha podido ser procesada correctamente por un problema en los datos (formato inválido). Por favor, revisa el campo y vuelve a enviarlo.';
    }

    // Mensaje por defecto (Ocultando detalles técnicos si no cayó en ningún filtro previo)
    console.error('Unhandled internal error in error mapper:', errorString); // Para logs internos
    return 'Ha ocurrido un error inesperado al procesar tu solicitud. Por favor, inténtalo de nuevo más tarde o contacta con soporte si el problema persiste.';
};

module.exports = { getUserFriendlyErrorMessage };
