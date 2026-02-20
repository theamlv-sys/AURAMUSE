import { supabase } from './supabaseClient';
import { SavedProject, Asset, StoryBibleEntry, SubscriptionTier, UsageStats, VersionSnapshot } from '../types';

export const persistenceService = {
    // --- VERSIONS ---
    async saveVersion(version: VersionSnapshot) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return null;

        const { data, error } = await supabase
            .from('project_versions')
            .upsert({
                id: version.id,
                project_type: version.projectType,
                content: version.content,
                description: version.description,
                timestamp: version.timestamp,
                user_id: userData.user.id
            })
            .select();

        if (error) {
            console.error("Error saving version:", error);
            throw error;
        }
        return data;
    },

    async loadVersions(): Promise<VersionSnapshot[]> {
        const { data, error } = await supabase
            .from('project_versions')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) {
            console.error("Error loading versions:", error);
            return [];
        }
        return data.map(v => ({
            id: v.id,
            projectType: v.project_type as any,
            timestamp: v.timestamp,
            content: v.content,
            description: v.description
        }));
    },

    async deleteVersion(id: string) {
        const { error } = await supabase
            .from('project_versions')
            .delete()
            .eq('id', id);
        if (error) {
            console.error("Error deleting version:", error);
            throw error;
        }
    },

    // --- PROJECTS ---
    async saveProject(project: SavedProject) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
            console.error("Save failed: No authenticated user found.");
            return null;
        }

        const { data, error } = await supabase
            .from('projects')
            .upsert({
                id: project.id,
                title: project.title,
                type: project.type,
                content: project.content,
                last_modified: new Date(project.lastModified).toISOString(),
                preview_snippet: project.previewSnippet,
                user_id: userData.user.id
            })
            .select();

        if (error) {
            console.error("Supabase Save Error:", error);
            throw error;
        }
        console.log("Project saved successfully to Supabase:", data);
        return data;
    },

    async loadProjects(): Promise<SavedProject[]> {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('last_modified', { ascending: false });

        if (error) return [];
        return data.map(p => ({
            id: p.id,
            title: p.title,
            type: p.type as any,
            content: p.content,
            lastModified: new Date(p.last_modified).getTime(),
            previewSnippet: p.preview_snippet
        }));
    },

    async deleteProject(id: string) {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- ASSETS ---
    async saveAsset(asset: Asset) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return null;

        const { data, error } = await supabase
            .from('assets')
            .upsert({
                id: asset.id,
                type: asset.type,
                url: asset.url,
                mime_type: asset.mimeType,
                name: asset.name,
                base64: asset.base64,
                text_content: asset.textContent,
                user_id: userData.user.id
            });
        if (error) throw error;
        return data;
    },

    async loadAssets(): Promise<Asset[]> {
        const { data, error } = await supabase
            .from('assets')
            .select('*');
        if (error) return [];
        return data.map(a => ({
            id: a.id,
            type: a.type as any,
            url: a.url,
            mimeType: a.mime_type,
            name: a.name,
            base64: a.base64,
            textContent: a.text_content
        }));
    },

    async deleteAsset(id: string) {
        const { error } = await supabase
            .from('assets')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- STORY BIBLE ---
    async saveBibleEntry(entry: StoryBibleEntry) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return null;

        const { data, error } = await supabase
            .from('story_bible')
            .upsert({
                id: entry.id,
                project_type: entry.projectType,
                category: entry.category,
                name: entry.name,
                description: entry.description,
                user_id: userData.user.id
            });
        if (error) throw error;
        return data;
    },

    async loadBible(): Promise<StoryBibleEntry[]> {
        const { data, error } = await supabase
            .from('story_bible')
            .select('*');
        if (error) return [];
        return data.map(e => ({
            id: e.id,
            projectType: e.project_type as any,
            category: e.category as any,
            name: e.name,
            description: e.description
        }));
    },

    async deleteBibleEntry(id: string) {
        const { error } = await supabase
            .from('story_bible')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- USAGE ---
    async syncUsage(tier: SubscriptionTier, usage: UsageStats) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { error } = await supabase
            .from('user_usage')
            .upsert({
                user_id: userData.user.id,
                user_tier: tier,
                usage_data: usage,
                updated_at: new Date().toISOString()
            });
        if (error) console.error('Usage sync failed:', error);
    },

    async loadUsage(): Promise<{ tier: SubscriptionTier, usage: UsageStats } | null> {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return null;

        const { data, error } = await supabase
            .from('user_usage')
            .select('*')
            .eq('user_id', userData.user.id)
            .single();

        if (error || !data) return null;
        return {
            tier: data.user_tier as SubscriptionTier,
            usage: data.usage_data as UsageStats
        };
    }
};
