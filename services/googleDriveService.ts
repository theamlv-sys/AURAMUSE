
export interface GoogleDoc {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
}

export const googleDriveService = {
    // 1. List Google Docs (Strictly Docs)
    async listDocs(token: string): Promise<GoogleDoc[]> {
        const query = "mimeType = 'application/vnd.google-apps.document' and trashed = false";
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime)&pageSize=20`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error("Full Drive Error:", errData);
            throw new Error(`Drive List Error: ${res.status} ${res.statusText} - ${JSON.stringify(errData)}`);
        }

        const data = await res.json();
        return data.files || [];
    },

    // 1b. List Media (Images & Videos)
    async listMedia(token: string): Promise<GoogleDoc[]> {
        const query = "(mimeType contains 'image/' or mimeType contains 'video/') and trashed = false";
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime,thumbnailLink)&pageSize=20`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error(`Drive Media List Error: ${res.statusText}`);
        }

        const data = await res.json();
        return data.files || [];
    },

    // 2. Import Google Doc Content (Export as Plain Text)
    async getDocContent(token: string, fileId: string): Promise<string> {
        // Export GDoc to text/plain
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error(`Drive Import Error: ${res.statusText}`);
        }

        return await res.text();
    },

    // 2b. Get File Blob (For Images/Videos)
    async getFileBlob(token: string, fileId: string): Promise<Blob> {
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error(`Drive Download Error: ${res.statusText}`);
        }

        return await res.blob();
    },

    // 3. Export to Google Doc (Create new or Update)
    async createDoc(token: string, title: string, content: string): Promise<string> {
        // Metadata
        const metadata = {
            name: title,
            mimeType: 'application/vnd.google-apps.document'
        };

        // Multipart body
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const contentType = 'application/json';

        const multipartRequestBody =
            delimiter +
            'Content-Type: ' + contentType + '\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: text/plain\r\n\r\n' +
            content +
            close_delim;

        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: multipartRequestBody
        });

        if (!res.ok) {
            throw new Error(`Drive Export Error: ${res.statusText}`);
        }

        const data = await res.json();
        return data.id;
    },

    // 4. Upload Raw Text File (e.g. .txt, .md)
    async uploadFile(token: string, title: string, content: string, mimeType: string = 'text/plain'): Promise<string> {
        const metadata = {
            name: title,
            mimeType: mimeType
        };

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            `Content-Type: ${mimeType}\r\n\r\n` +
            content +
            close_delim;

        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: multipartRequestBody
        });

        if (!res.ok) {
            throw new Error(`Drive Upload Error: ${res.statusText}`);
        }

        const data = await res.json();
        return data.id;
    },

    // 5. Upload binary blob (images, videos) to Google Drive
    async uploadBlob(token: string, fileName: string, blob: Blob, mimeType: string): Promise<string> {
        const metadata = { name: fileName, mimeType };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: form
        });

        if (!res.ok) throw new Error(`Drive Upload Error: ${res.statusText}`);
        const data = await res.json();
        return data.id;
    }
};
