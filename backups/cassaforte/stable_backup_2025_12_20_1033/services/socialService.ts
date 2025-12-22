
import { showToast } from "../components/ToastProvider";

// META GRAPH API VERSION
const API_VER = 'v18.0';

interface FacebookpostResult {
    success: boolean;
    id?: string;
    error?: string;
}

/**
 * Publishes a post to a Facebook Page.
 * Requires a valid Page Access Token with 'pages_manage_posts' permission.
 */
export const publishToFacebook = async (
    pageId: string,
    accessToken: string,
    message: string,
    imageUrl?: string
): Promise<FacebookpostResult> => {
    try {
        let url = `https://graph.facebook.com/${API_VER}/${pageId}/feed`;
        const body: any = {
            message: message,
            access_token: accessToken,
            published: true
        };

        // If image is present, use the /photos endpoint instead (simplest way for single image)
        // Note: For real URL images. If base64, needs FormData.
        if (imageUrl && imageUrl.startsWith('http')) {
            url = `https://graph.facebook.com/${API_VER}/${pageId}/photos`;
            body.url = imageUrl;
            // Facebook photos endpoint uses 'caption' instead of 'message' usually, 
            // but 'message' often works too. 'caption' is safer for photos.
            body.caption = message;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.error) {
            console.error("Facebook API Error:", data.error);
            return { success: false, error: data.error.message };
        }

        return { success: true, id: data.id };
    } catch (e: any) {
        console.error("Network Error:", e);
        return { success: false, error: e.message || "Network Error" };
    }
};

/**
 * Publishes a post to Instagram Business Account.
 * Flow: 
 * 1. Create Media Container (POST /metrics/media)
 * 2. Publish Container (POST /metrics/media_publish)
 */
export const publishToInstagram = async (
    igUserId: string,
    accessToken: string,
    caption: string,
    imageUrl: string // IG requires an Image URL
): Promise<FacebookpostResult> => {
    try {
        if (!imageUrl) {
            return { success: false, error: "Instagram requires an image." };
        }

        // Step 1: Create Container
        const containerUrl = `https://graph.facebook.com/${API_VER}/${igUserId}/media`;
        const containerRes = await fetch(containerUrl, {
            method: 'POST',
            body: new URLSearchParams({
                image_url: imageUrl,
                caption: caption,
                access_token: accessToken
            })
        });
        const containerData = await containerRes.json();

        if (containerData.error) {
            return { success: false, error: "Container Error: " + containerData.error.message };
        }

        const creationId = containerData.id;

        // Step 2: Publish
        const publishUrl = `https://graph.facebook.com/${API_VER}/${igUserId}/media_publish`;
        const publishRes = await fetch(publishUrl, {
            method: 'POST',
            body: new URLSearchParams({
                creation_id: creationId,
                access_token: accessToken
            })
        });
        const publishData = await publishRes.json();

        if (publishData.error) {
            return { success: false, error: "Publish Error: " + publishData.error.message };
        }

        return { success: true, id: publishData.id };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
};
