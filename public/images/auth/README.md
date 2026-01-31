# Ilustraciones para Auth (Login y Register)

## 📁 Imágenes Opcionales

Estas ilustraciones son **opcionales**. Las páginas ya tienen un diseño limpio con iconos grandes. Si quieres añadir más personalidad, puedes incluir:

### `/auth/`
- `login-illustration.svg` o `login-illustration.png` - Ilustración de dashboard/analytics
- `register-illustration.svg` o `register-illustration.png` - Ilustración de cohete/éxito

**Recomendaciones:**
- Formato: SVG preferido (escalable sin pérdida)
- Alternativa: PNG con transparencia
- Tamaño: 600x600px aprox
- Peso máximo: 100KB
- Estilo: Minimalista, colores amarillo (#FFD700) y verde neón (#00ff88)

## 🎨 Fuentes de Ilustraciones Gratuitas

1. **[unDraw](https://undraw.co/illustrations)** - Ilustraciones SVG personalizables
   - Buscar: "dashboard", "analytics", "login", "register"
   - Cambiar color principal a #FFD700 (amarillo)

2. **[Storyset](https://storyset.com/)** - Ilustraciones animadas y estáticas
   - Buscar: "technology", "data", "user"
   - Descargar en SVG

3. **[Humaaans](https://www.humaaans.com/)** - Personas ilustradas mezclables
   - Para crear escenas personalizadas

4. **[DrawKit](https://www.drawkit.com/)** - Ilustraciones gratuitas
   - Sección: "Business & Finance"

## 🔧 Cómo Implementar

Si decides añadir ilustraciones, simplemente **descomenta** las líneas en:

### Login: [views/auth/login.ejs](../../views/auth/login.ejs)
```html
<!-- Línea ~37 -->
<img src="/images/auth/login-illustration.svg" alt="Login" class="w-full h-auto">
```

### Register: [views/auth/register.ejs](../../views/auth/register.ejs)
```html
<!-- Línea ~37 -->
<img src="/images/auth/register-illustration.svg" alt="Register" class="w-full h-auto">
```

## ✅ Estado Actual

**Sin ilustraciones:**
- ✅ Iconos grandes (casa con corazón para login, cohete para register)
- ✅ Lista de beneficios con checkmarks
- ✅ Diseño limpio y profesional

**Con ilustraciones (opcional):**
- Reemplaza el icono grande por una ilustración SVG completa
- Mayor personalidad visual
- Más moderno y atractivo

---

**Nota:** Las páginas ya funcionan perfectamente sin ilustraciones. Solo añádelas si quieres ese toque extra de diseño.
