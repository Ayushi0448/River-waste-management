/**
 * api.js — single place that knows where the Flask + SQLite backend lives.
 * Change this one constant if the backend host/port ever changes.
 */
export const API_BASE = 'http://127.0.0.1:5000';

/** Prefix a backend-relative path (e.g. an uploaded image) with the API host. */
export const apiUrl = (path = '') =>
  `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
