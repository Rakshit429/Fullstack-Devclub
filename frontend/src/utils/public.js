import axios from 'axios';

// Create a new instance of axios that does NOT have the
// withCredentials flag set. We will use this for all
// public, third-party API calls.
const publicApi = axios.create({
  baseURL: 'https://api.mymemory.translated.net',
});

// The default axios instance will still have withCredentials = true
// for our own backend calls.

export default publicApi;