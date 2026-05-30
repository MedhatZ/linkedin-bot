import axios from 'axios';

const UGC_POSTS_URL = 'https://api.linkedin.com/v2/ugcPosts';

export async function publishPost(text) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  if (!accessToken) {
    throw new Error('LINKEDIN_ACCESS_TOKEN is not set');
  }
  if (!personUrn) {
    throw new Error('LINKEDIN_PERSON_URN is not set');
  }

  const payload = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text,
        },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  try {
    const response = await axios.post(UGC_POSTS_URL, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      timeout: 30000,
    });

    const postId = response.headers['x-restli-id'] || response.data?.id || 'unknown';
    console.log(`[${new Date().toISOString()}] LinkedIn post published successfully. Post ID: ${postId}`);

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
