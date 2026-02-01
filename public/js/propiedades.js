function eliminarVivienda(id) {
  if (!confirm('¿Estás seguro de que quieres eliminar esta vivienda?')) {
    return;
  }

  fetch(`/propiedades/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('Vivienda eliminada correctamente');
      window.location.reload();
    } else {
      alert('Error al eliminar la vivienda');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Error al eliminar la vivienda');
  });
}