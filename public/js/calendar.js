// Calendario dinámico para el sidebar
class MiniCalendar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentDate = new Date();
        this.today = new Date();
        this.reservations = []; // Array de fechas con reservas
        this.render();
    }

    // Configurar días con reservas (se puede llamar desde fuera)
    setReservations(dates) {
        this.reservations = dates;
        this.render();
    }

    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay(); // 0 = domingo
        
        // Ajustar para que lunes sea el primer día (0 = lunes, 6 = domingo)
        const startDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
        
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
        
        let html = `
            <div class="mini-calendar">
                <div class="mini-calendar-header">
                    <button class="btn btn-sm btn-link text-secondary p-0" id="prevMonth">
                        <i class="bi bi-chevron-left"></i>
                    </button>
                    <span class="fw-semibold">${monthNames[month]} ${year}</span>
                    <button class="btn btn-sm btn-link text-secondary p-0" id="nextMonth">
                        <i class="bi bi-chevron-right"></i>
                    </button>
                </div>
                <div class="mini-calendar-grid">
        `;
        
        // Días de la semana
        dayNames.forEach(day => {
            html += `<div class="mini-day-header">${day}</div>`;
        });
        
        // Días vacíos antes del primer día del mes
        for (let i = 0; i < startDay; i++) {
            html += `<div class="mini-day empty"></div>`;
        }
        
        // Días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = this.isToday(year, month, day);
            const hasReservation = this.hasReservation(currentDateStr);
            
            let classes = 'mini-day';
            if (isToday) classes += ' today';
            if (hasReservation) classes += ' has-reservation';
            
            html += `<div class="${classes}" data-date="${currentDateStr}">${day}</div>`;
        }
        
        html += `
                </div>
                <div class="mt-2 text-center">
                    <a href="/calendario" class="btn btn-sm btn-outline-secondary">
                        <i class="bi bi-calendar3 me-1"></i>Ver calendario completo
                    </a>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        this.attachEventListeners();
    }
    
    isToday(year, month, day) {
        return year === this.today.getFullYear() &&
               month === this.today.getMonth() &&
               day === this.today.getDate();
    }
    
    hasReservation(dateStr) {
        return this.reservations.includes(dateStr);
    }
    
    attachEventListeners() {
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.render();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.render();
            });
        }
        
        // Click en días individuales (opcional)
        const days = this.container.querySelectorAll('.mini-day:not(.empty)');
        days.forEach(day => {
            day.addEventListener('click', (e) => {
                const date = e.target.getAttribute('data-date');
                if (date) {
                    this.onDayClick(date);
                }
            });
        });
    }
    
    onDayClick(date) {
        // Función que se puede sobrescribir para manejar clicks en días
        console.log('Día seleccionado:', date);
        // Redirigir al calendario completo con la fecha seleccionada
        window.location.href = `/calendario?fecha=${date}`;
    }
    
    // Ir al mes actual
    goToToday() {
        this.currentDate = new Date();
        this.render();
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('miniCalendarContainer')) {
        const calendar = new MiniCalendar('miniCalendarContainer');
        
        // Ejemplo: configurar días con reservas
        // En producción, esto vendría del backend
        const reservationDates = [
            '2026-01-31', // Ejemplo de fechas con reservas
            '2026-02-05',
            '2026-02-14',
            '2026-02-20'
        ];
        
        calendar.setReservations(reservationDates);
        
        // Hacer el calendario accesible globalmente si es necesario
        window.miniCalendar = calendar;
    }
});
