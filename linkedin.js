import axios from 'axios';
import { getConfig } from './config.js';

const UGC_POSTS_URL = 'https://api.linkedin.com/v2/ugcPosts';
const REGISTER_UPLOAD_URL = 'https://api.linkedin.com/v2/assets?action=registerUpload';

function linkedinHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  };
}

async function uploadImage(accessToken, personUrn, imageBuffer, title) {
  const registerResponse = await axios.post(
    REGISTER_UPLOAD_URL,
    {
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: personUrn,
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          },
        ],
      },
    },
    { headers: linkedinHeaders(accessToken), timeout: 30000 }
  );

  const uploadUrl =
    registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']
      .uploadUrl;
  const assetUrn = registerResponse.data.value.asset;

  await axios.put(uploadUrl, imageBuffer, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    timeout: 60000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return { assetUrn, title: title.slice(0, 200) };
}

export async function publishPost(text, imageBuffer = null) {
  const { linkedinAccessToken: accessToken, linkedinPersonUrn: personUrn } = getConfig();

  if (!accessToken) {
    throw new Error('LINKEDIN_ACCESS_TOKEN is not set');
  }
  if (!personUrn) {
    throw new Error('LINKEDIN_PERSON_URN is not set');
  }

  const shareContent = {
    shareCommentary: { text },
    shareMediaCategory: imageBuffer ? 'IMAGE' : 'NONE',
  };

  if (imageBuffer) {
    const hook = text.split('\n').find((line) => line.trim())?.trim() || 'Tech insight';
    const { assetUrn, title } = await uploadImage(accessToken, personUrn, imageBuffer, hook);

    shareContent.media = [
      {
        status: 'READY',
        description: { text: title },
        media: assetUrn,
        title: { text: title },
      },
    ];
  }

  const payload = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': shareContent,
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  try {
    const response = await axios.post(UGC_POSTS_URL, payload, {
      headers: linkedinHeaders(accessToken),
      timeout: 30000,
    });

    const postId = response.headers['x-restli-id'] || response.data?.id || 'unknown';
    console.log(
      `[${new Date().toISOString()}] LinkedIn post published successfully${imageBuffer ? ' with image' : ''}. Post ID: ${postId}`
    );

    return { postId, response: response.data };
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    if (status === 401 || status === 403) {
      console.warn(
        `[${new Date().toISOString()}] LinkedIn token may be expired or invalid (HTTP ${status}). ` +
          'Please refresh your access token. Error: ' +
          message
      );
      throw new Error(`LinkedIn auth error (${status}): ${message}`);
    }

    throw new Error(`LinkedIn post failed: ${message}`);
  }
}
