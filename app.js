document.addEventListener('DOMContentLoaded', async () => {
    // Icons
    lucide.createIcons();

    // App state
    let allStops = [];
    let allEntries = [];
    let dateToStopMap = {};

    try {
        const timestamp = new Date().getTime();
        const [itineraryRes, journalRes] = await Promise.all([
            fetch(`./data/itinerary.json?v=${timestamp}`, { cache: "no-store" }),
            fetch(`./data/journal.json?v=${timestamp}`, { cache: "no-store" })
        ]);
        
        const itineraryData = await itineraryRes.json();
        const journalData = await journalRes.json();
        
        allStops = itineraryData.stops || [];
        allEntries = journalData.entries || [];
        
        // Build Date Map
        allStops.forEach(stop => {
            const dates = parseItineraryDates(stop.date);
            dates.forEach(d => {
                const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
                dateToStopMap[dateStr] = stop;
            });
        });

        // Setup Back Button
        document.getElementById('btn-back').addEventListener('click', () => {
            document.getElementById('screen-details').classList.add('hidden');
            document.getElementById('screen-calendar').classList.remove('hidden');
            window.scrollTo(0,0);
        });

        // Render Calendar
        generateCalendar(dateToStopMap, allEntries);

    } catch (err) {
        console.error("Error loading trip data", err);
        document.getElementById('calendar-container').innerHTML = `
            <div style="text-align: center; color: var(--accent-color);">
                <h2>Error loading data. Run via a local server.</h2>
            </div>
        `;
    }
});

function parseItineraryDates(dateStr) {
    // Example: "Apr 12–13", "May 21-Jun 7", "Apr 18"
    dateStr = dateStr.replace(/–/g, '-').replace(/—/g, '-').replace(/\s*-\s*/g, '-');
    const year = 2026;
    const parts = dateStr.split('-');
    
    const parseSingleDate = (s, defaultMonth) => {
        s = s.trim();
        const tokens = s.split(' ');
        if (tokens.length === 2 || (tokens.length > 2)) {
            // "May 21"
            return {
                month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(tokens[0]),
                day: parseInt(tokens[1], 10)
            };
        } else if (tokens.length === 1 && defaultMonth !== null) {
            // "13"
            return { month: defaultMonth, day: parseInt(tokens[0], 10) };
        }
        return null;
    };
    
    let dates = [];
    if (parts.length === 1) {
        const d1 = parseSingleDate(parts[0], null);
        if (d1) dates.push(new Date(year, d1.month, d1.day));
    } else if (parts.length === 2) {
        const d1 = parseSingleDate(parts[0], null);
        const d2 = parseSingleDate(parts[1], d1 ? d1.month : null);
        
        if (d1 && d2) {
            let current = new Date(year, d1.month, d1.day);
            const end = new Date(year, d2.month, d2.day);
            while (current <= end) {
                dates.push(new Date(current));
                current.setDate(current.getDate() + 1);
            }
        }
    }
    return dates;
}

function generateCalendar(dateMap, allEntries) {
    const container = document.getElementById('calendar-container');
    const year = 2026;
    // We want April (3), May (4), June (5)
    const months = [
        {name: "April", index: 3},
        {name: "May", index: 4},
        {name: "June", index: 5}
    ];

    months.forEach(month => {
        const block = document.createElement('div');
        block.className = 'month-block';
        
        block.innerHTML = `<h2 class="month-title">${month.name}</h2>`;
        
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';
        
        // Days of week header
        ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d => {
            grid.innerHTML += `<div class="day-header">${d}</div>`;
        });
        
        const firstDay = new Date(year, month.index, 1).getDay();
        const daysInMonth = new Date(year, month.index + 1, 0).getDate();
        
        // Padding
        for (let i = 0; i < firstDay; i++) {
            grid.innerHTML += `<div class="day-cell empty"></div>`;
        }
        
        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month.index + 1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const stop = dateMap[dateStr];
            
            const cell = document.createElement('div');
            cell.className = 'day-cell';
            cell.textContent = i;
            
            if (stop) {
                cell.classList.add('active-stop');
                cell.addEventListener('click', () => {
                    openDetails(stop, dateStr, allEntries);
                });
            }
            grid.appendChild(cell);
        }
        block.appendChild(grid);
        container.appendChild(block);
    });
}

function openDetails(stop, selectedDateStr, allEntries) {
    // Show details screen
    document.getElementById('screen-calendar').classList.add('hidden');
    document.getElementById('screen-details').classList.remove('hidden');
    
    // Details
    const humanDateStr = new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById('detail-date').textContent = `${humanDateStr}  —  ${stop.date}`;
    document.getElementById('detail-title').textContent = stop.title;
    document.getElementById('detail-desc').textContent = stop.description;
    
    const accCard = document.getElementById('card-accommodation');
    if (stop.accommodation) {
        accCard.classList.remove('hidden');
        document.getElementById('detail-acc').textContent = stop.accommodation;
    } else {
        accCard.classList.add('hidden');
    }
    
    // JournalEntries - Prioritize entries specifically for this date, otherwise show all entries for this block
    const journalContainer = document.getElementById('journal-entries');
    
    let relevantEntries = allEntries.filter(e => e.date === selectedDateStr);
    
    let subtext = `Notes specifically for ${humanDateStr}.`;
    
    if (relevantEntries.length === 0) {
        // Fallback to any entries for the stop if none match the exact day, just to show *something*
        relevantEntries = allEntries.filter(e => e.stopId === stop.id);
        subtext = `Showing notes for the whole stop block, as none are specifically tied to ${humanDateStr}.`;
    }
    
    if (relevantEntries.length > 0) {
        let htmlStr = `<p style="color:var(--text-secondary); font-size: 0.85rem; margin-bottom: 20px">${subtext}</p>`;
        htmlStr += relevantEntries.map(entry => `
            <div class="journal-entry">
                <div class="journal-title">${entry.title || 'Untitled'}</div>
                <div class="journal-body">${entry.content}</div>
            </div>
        `).join('');
        journalContainer.innerHTML = htmlStr;
    } else {
        journalContainer.innerHTML = `
            <div style="color: var(--text-secondary); font-style: italic; padding: 20px 0;">
                No journal entries yet for ${humanDateStr}. Edit journal.json to add one!
            </div>
        `;
    }
    
    window.scrollTo(0,0);
}
