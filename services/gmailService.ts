
export interface EmailMessage {
    id: string;
    threadId: string;
    snippet: string;
    internalDate: string;
    subject: string;
    from: string;
    to: string;
    body: string;
    isUnread: boolean;
}

export const gmailService = {
    async getProfile(token: string): Promise<boolean> {
        try {
            const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.ok;
        } catch (error) {
            return false;
        }
    },

    async listMessages(token: string, maxResults = 10, query = 'in:inbox'): Promise<EmailMessage[]> {
        try {
            // console.log(`GmailService: Listing messages`);
            // 1. List IDs - Fetch extra to allow for filter dropouts
            const fetchCount = maxResults + 15;
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${fetchCount}&q=${encodeURIComponent(query)}`;
            // console.log(`GmailService Fetching`);

            const listRes = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!listRes.ok) {
                const errorText = await listRes.text();
                console.error(`Gmail API Error (${listRes.status}): ${errorText}`);
                throw new Error(`Gmail API error: ${listRes.statusText}`);
            }
            const listData = await listRes.json();

            if (!listData.messages) return [];

            // 2. Fetch details for each (in parallel)
            const detailsPromises = listData.messages.map(async (msg: { id: string }) => {
                try {
                    const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (!detailRes.ok) return null;
                    return detailRes.json();
                } catch (e) {
                    console.warn(`Failed to fetch message ${msg.id}`, e);
                    return null; // Skip failed messages
                }
            });

            const rawMessages = (await Promise.all(detailsPromises)).filter(m => m !== null);

            // Trim to requested size
            const validMessages = rawMessages.slice(0, maxResults);

            // 3. Transform to clean EmailMessage
            return validMessages.map((msg: any) => {
                const headers = msg.payload.headers;
                const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || '';

                let body = '';
                if (msg.payload.body.data) {
                    body = atob(msg.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                } else if (msg.payload.parts) {
                    const textPart = msg.payload.parts.find((p: any) => p.mimeType === 'text/plain');
                    if (textPart && textPart.body.data) {
                        body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                    }
                }

                return {
                    id: msg.id,
                    threadId: msg.threadId,
                    snippet: msg.snippet,
                    internalDate: msg.internalDate,
                    subject: getHeader('Subject'),
                    from: getHeader('From'),
                    to: getHeader('To'),
                    body: body,
                    isUnread: msg.labelIds?.includes('UNREAD') || false
                };
            });

        } catch (error) {
            console.error("Gmail Fetch Error:", error);
            throw error;
        }
    },

    async sendEmail(token: string, to: string, subject: string, body: string) {
        // Construct raw email compliant with RFC 2822
        const emailContent =
            `To: ${to}\r\n` +
            `Subject: ${subject}\r\n` +
            `Content-Type: text/plain; charset=utf-8\r\n\r\n` +
            `${body}`;

        const base64EncodedEmail = btoa(emailContent).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                raw: base64EncodedEmail
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error?.message || 'Failed to send email');
        }

        return res.json();
    }
};
