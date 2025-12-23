// Supabase configuration file
// This file defines the connection details for the Supabase backend.
// It exposes a global `SB_CONFIG` object which contains the base URL and
// anonymous API key required to access your Supabase project's REST
// interface. The helper method `headers()` returns the correct set of
// headers needed on each request.

;(function () {
  'use strict';

  // These values are provided by the user. Do not modify them here.
  var url = 'https://daaxfvepnujsuftzcfcv.supabase.co';
  var anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhYXhmdmVwbnVqc3VmdHpjZmN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NTUxMzMsImV4cCI6MjA4MjAzMTEzM30.WjpjKmK2j7omDIH2n_Q7gzC7Ei-KinARMF2FlUj4qyA';

  // Build an object with helper functions for constructing API requests.
  var SB_CONFIG = {
    url: url,
    anonKey: anonKey,
    headers: function () {
      return {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
    }
  };

  // Expose globally
  if (typeof window !== 'undefined') {
    window.SB_CONFIG = SB_CONFIG;
  }
})();
