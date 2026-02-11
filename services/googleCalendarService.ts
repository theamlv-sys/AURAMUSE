export const googleCalendarService = {
    async listEvents(token: string) {
        try {
            const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?orderBy=startTime&singleEvents=true&timeMin=' + new Date().toISOString(), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch events');
            const data = await response.json();
            return data.items || [];
        } catch (error) {
            console.error("Calendar API Error:", error);
            throw error;
        }
    },

    async createEvent(token: string, event: { summary: string, description: string, start: string, end: string }) {
        try {
            const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    summary: event.summary,
                    description: event.description,
                    start: { dateTime: event.start },
                    end: { dateTime: event.end }
                })
            });
            if (!response.ok) throw new Error('Failed to create event');
            return await response.json();
        } catch (error) {
            console.error("Calendar Create Error:", error);
            throw error;
        }
    },

    async deleteEvent(token: string, eventId: string) {
        try {
            const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to delete event');
            return true;
        } catch (error) {
            console.error("Calendar Delete Error:", error);
            throw error;
        }
    }
};
