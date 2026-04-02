document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch data
        const [itineraryRes, journalRes] = await Promise.all([
            fetch('./data/itinerary.json'),
            fetch('./data/journal.json')
        ]);
        
        const itineraryData = await itineraryRes.json();
        const journalData = await journalRes.json();
        
        const stops = itineraryData.stops || [];
        const entries = journalData.entries || [];
        
        const timelineEl = document.getElementById('timeline');
        
        // Render Timeline
        stops.forEach((stop) => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.dataset.id = stop.id;
            
            item.innerHTML = `
                <div class="timeline-indicator"></div>
                <span class="timeline-date">${stop.date}</span>
                <span class="timeline-title">${stop.title}</span>
            `;
            
            item.addEventListener('click', () => {
                selectStop(stop, item, entries);
            });
            
            timelineEl.appendChild(item);
        });

    } catch (err) {
        console.error("Error loading trip data", err);
        document.getElementById('empty-state').innerHTML = `
            <h2>Error loading data</h2>
            <p>Please ensure you are running this through a local web server so fetch() works.</p>
        `;
    }
});

function selectStop(stop, itemEl, allEntries) {
    // Update active state in timeline
    document.querySelectorAll('.timeline-item').forEach(el => el.classList.remove('active'));
    itemEl.classList.add('active');
    
    // Hide empty state, show details
    document.getElementById('empty-state').classList.add('hidden');
    const detailsEl = document.getElementById('stop-details');
    detailsEl.classList.remove('hidden');
    
    // Reset animation
    detailsEl.style.animation = 'none';
    detailsEl.offsetHeight; /* trigger reflow */
    detailsEl.style.animation = null;
    
    // Populate details
    document.getElementById('detail-date').textContent = stop.date;
    document.getElementById('detail-title').textContent = stop.title;
    document.getElementById('detail-desc').textContent = stop.description;
    
    const accCard = document.getElementById('card-accommodation');
    if (stop.accommodation) {
        accCard.classList.remove('hidden');
        document.getElementById('detail-acc').textContent = stop.accommodation;
    } else {
        accCard.classList.add('hidden');
    }
    
    // Populate journal entries
    const stopEntries = allEntries.filter(e => e.stopId === stop.id);
    const journalContainer = document.getElementById('journal-entries');
    
    if (stopEntries.length > 0) {
        journalContainer.innerHTML = stopEntries.map(entry => `
            <div class="journal-entry">
                <div class="journal-meta">${entry.date || ''}</div>
                <div class="journal-title">${entry.title || 'Untitled Entry'}</div>
                <div class="journal-body">${entry.content}</div>
            </div>
        `).join('');
    } else {
        journalContainer.innerHTML = `
            <div style="color: var(--text-secondary); font-style: italic; padding: 20px 0;">
                No journal entries yet for this destination.
            </div>
        `;
    }
}
