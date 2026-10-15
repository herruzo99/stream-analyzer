/**
 * A curated list of public DASH, HLS, SRT and low-latency streams for testing
 * and demonstration purposes. Every entry is verified against the live source
 * before landing (see the per-entry `verified` field).
 * @typedef {'dash' | 'hls' | 'srt' | 'whep' | 'whip' | 'moq' | 'rtmp' | 'icecast'} Protocol
 * @typedef {'vod' | 'live'} StreamType
 * @typedef {object} ExampleStream
 * @property {string} name - A descriptive name for the stream.
 * @property {string} url - The manifest URL.
 * @property {Protocol} protocol - The streaming protocol.
 * @property {StreamType} type - The stream type (VOD or Live).
 * @property {string} source - The provider of the stream.
 * @property {string} category - A sub-category for better organization.
 * @property {string[]} [namespace] - explicit MoQ broadcast namespace, for
 *   relays where the URL path cannot carry it (e.g. Cloudflare's draft-16
 *   relay uses the path for its auth token).
 * @property {string} [verified] - ISO date the URL was last verified live.
 * @property {string} [notes] - What makes this example worth analyzing.
 * @property {object} [auth] - Authentication details.
 * @property {object} [drmAuth] - DRM authentication details.
 * @property {string | {[key: string]: string}} [drmAuth.licenseServerUrl] - The license server URL(s) for Widevine/PlayReady. Can be a single string or an object mapping key system names to URLs.
 * @property {string | File | ArrayBuffer | {[key: string]: string | File | ArrayBuffer} | null} [drmAuth.serverCertificate] - The DRM server certificate. Can be a single value for all systems, or an object mapping key system names to specific certificates.
 * @property {object} [drmAuth.clearKeys] - Clear Key configuration.
 * @property {Array<{id: number, key: string, value: string}>} [drmAuth.headers] - Headers for the license request.
 */

const v10LicenseServers = {
    'com.widevine.alpha':
        'https://drm-widevine-licensing.axprod.net/AcquireLicense',
    'com.microsoft.playready':
        'https://drm-playready-licensing.axprod.net/AcquireLicense',
    'com.apple.fps': 'https://drm-fairplay-licensing.axprod.net/AcquireLicense',
};

const v10Tokens = {
    h264SingleKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJ2ZXJzaW9uIjogMSwKICAiY29tX2tleV9pZCI6ICI2OWU1NDA4OC1lOWUwLTQ1MzAtOGMxYS0xZWI2ZGNkMGQxNGUiLAogICJtZXNzYWdlIjogewogICAgInR5cGUiOiAiZW50aXRsZW1lbnRfbWVzc2FnZSIsCiAgICAidmVyc2lvbiI6IDIsCiAgICAibGljZW5zZSI6IHsKICAgICAgImFsbG93X3BlcnNpc3RlbmNlIjogdHJ1ZQogICAgfSwKICAgICJjb250ZW50X2tleXNfc291cmNlIjogewogICAgICAiaW5saW5lIjogWwogICAgICAgIHsKICAgICAgICAgICJpZCI6ICIzMDJmODBkZC00MTFlLTQ4ODYtYmNhNS1iYjFmODAxOGEwMjQiLAogICAgICAgICAgImVuY3J5cHRlZF9rZXkiOiAicm9LQWcwdDdKaTFpNDNmd3YremZ0UT09IiwKICAgICAgICAgICJ1c2FnZV9wb2xpY3kiOiAiUG9saWN5IEEiCiAgICAgICAgfQogICAgICBdCiAgICB9LAogICAgImNvbnRlbnRfa2V5X3VzYWdlX3BvbGljaWVzIjogWwogICAgICB7CiAgICAgICAgIm5hbWUiOiAiUG9saWN5IEEiLAogICAgICAgICJwbGF5cmVhZHkiOiB7CiAgICAgICAgICAibWluX2RldmljZV9zZWN1cml0eV9sZXZlbCI6IDE1MCwKICAgICAgICAgICJwbGF5X2VuYWJsZXJzIjogWwogICAgICAgICAgICAiNzg2NjI3RDgtQzJBNi00NEJFLThGODgtMDhBRTI1NUIwMUE3IgogICAgICAgICAgXQogICAgICAgIH0KICAgICAgfQogICAgXQogIH0KfQ._NfhLVY7S6k8TJDWPeMPhUawhympnrk6WAZHOVjER6M',
    h264MultiKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJ2ZXJzaW9uIjogMSwKICAiY29tX2tleV9pZCI6ICI2OWU1NDA4OC1lOWUwLTQ1MzAtOGMxYS0xZWI2ZGNkMGQxNGUiLAogICJtZXNzYWdlIjogewogICAgInR5cGUiOiAiZW50aXRsZW1lbnRfbWVzc2FnZSIsCiAgICAidmVyc2lvbiI6IDIsCiAgICAibGljZW5zZSI6IHsKICAgICAgImFsbG93X3BlcnNpc3RlbmNlIjogdHJ1ZQogICAgfSwKICAgICJjb250ZW50X2tleXNfc291cmNlIjogewogICAgICAiaW5saW5lIjogWwogICAgICAgIHsKICAgICAgICAgICJpZCI6ICJiNTRlYzkxNC0xOTJkLTRlYTEtYWMxOS1mNDI5ZWI0OTgyNjgiLAogICAgICAgICAgImVuY3J5cHRlZF9rZXkiOiAiR1ZERnJZUU9Bb1kzZmpxVVVtamswQT09IiwKICAgICAgICAgICJ1c2FnZV9wb2xpY3kiOiAiUG9saWN5IEEiCiAgICAgICAgfSwKICAgICAgICB7CiAgICAgICAgICAiaWQiOiAiYzgzYzRlYTgtMGYyYS00NTIzLTg1MWMtZmJlY2NkYzBmMjAyIiwKICAgICAgICAgICJlbmNyeXB0ZWRfa2V5IjogIlRKZGZsWmJLYmZXQXl5K1dta21UUEE9PSIsCiAgICAgICAgICAidXNhZ2VfcG9saWN5IjogIlBvbGljeSBBIgogICAgICAgIH0sCiAgICAgICAgewogICAgICAgICAgImlkIjogImM4NjhjNzAyLWM3MWItNDA2NC1hZTJiLWMyNGY3Y2MxMDc5MiIsCiAgICAgICAgICAiZW5jcnlwdGVkX2tleSI6ICJ4QXJpUkpOcUFTdXp6RExDRzNXSjdnPT0iLAogICAgICAgICAgInVzYWdlX3BvbGljeSI6ICJQb2xpY3kgQSIKICAgICAgICB9CiAgICAgIF0KICAgIH0sCiAgICAiY29udGVudF9rZXlfdXNhZ2VfcG9saWNpZXMiOiBbCiAgICAgIHsKICAgICAgICAibmFtZSI6ICJQb2xpY3kgQSIsCiAgICAgICAgInBsYXlyZWFkeSI6IHsKICAgICAgICAgICJtaW5fZGV2aWNlX3NlY3VyaXR5X2xldmVsIjogMTUwLAogICAgICAgICAgInBsYXlfZW5hYmxlcnMiOiBbCiAgICAgICAgICAgICI3ODY2MjdEOC1DMkE2LTQ0QkUtOEY4OC0wOEFFMjU1QjAxQTciCiAgICAgICAgICBdCiAgICAgICAgfQogICAgICB9CiAgICBdCiAgfQp9.XC0YIbZpKGFc3IZROklP4LvISc6cZGpE9UL-XcpcqWg',
    h265SingleKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJ2ZXJzaW9uIjogMSwKICAiY29tX2tleV9pZCI6ICI2OWU1NDA4OC1lOWUwLTQ1MzAtOGMxYS0xZWI2ZGNkMGQxNGUiLAogICJtZXNzYWdlIjogewogICAgInR5cGUiOiAiZW50aXRsZW1lbnRfbWVzc2FnZSIsCiAgICAidmVyc2lvbiI6IDIsCiAgICAibGljZW5zZSI6IHsKICAgICAgImFsbG93X3BlcnNpc3RlbmNlIjogdHJ1ZQogICAgfSwKICAgICJjb250ZW50X2tleXNfc291cmNlIjogewogICAgICAiaW5saW5lIjogWwogICAgICAgIHsKICAgICAgICAgICJpZCI6ICJhYmNjNDRlNS1jMTIyLTQ1YWItYWM4MC1hNWIzNTIyYTBhMzEiLAogICAgICAgICAgImVuY3J5cHRlZF9rZXkiOiAiZnM2VUx1UzR3SFQxdkI2M0RONnI5UT09IiwKICAgICAgICAgICJ1c2FnZV9wb2xpY3kiOiAiUG9saWN5IEEiCiAgICAgICAgfQogICAgICBdCiAgICB9LAogICAgImNvbnRlbnRfa2V5X3VzYWdlX3BvbGljaWVzIjogWwogICAgICB7CiAgICAgICAgIm5hbWUiOiAiUG9saWN5IEEiLAogICAgICAgICJwbGF5cmVhZHkiOiB7CiAgICAgICAgICAibWluX2RldmljZV9zZWN1cml0eV9sZXZlbCI6IDE1MCwKICAgICAgICAgICJwbGF5X2VuYWJsZXJzIjogWwogICAgICAgICAgICAiNzg2NjI3RDgtQzJBNi00NEJFLThGODgtMDhBRTI1NUIwMUE3IgogICAgICAgICAgXQogICAgICAgIH0KICAgICAgfQogICAgXQogIH0KfQ.5rM_qUo4dKrHNDKQO0yzbCiufJxFUzHeOQc13Z48rv4',
    h265MultiKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJ2ZXJzaW9uIjogMSwKICAiY29tX2tleV9pZCI6ICI2OWU1NDA4OC1lOWUwLTQ1MzAtOGMxYS0xZWI2ZGNkMGQxNGUiLAogICJtZXNzYWdlIjogewogICAgInR5cGUiOiAiZW50aXRsZW1lbnRfbWVzc2FnZSIsCiAgICAidmVyc2lvbiI6IDIsCiAgICAibGljZW5zZSI6IHsKICAgICAgImFsbG93X3BlcnNpc3RlbmNlIjogdHJ1ZQogICAgfSwKICAgICJjb250ZW50X2tleXNfc291cmNlIjogewogICAgICAiaW5saW5lIjogWwogICAgICAgIHsKICAgICAgICAgICJpZCI6ICI1M2RjM2VhYS01MTY0LTQxMGEtOGY0ZS1lMTUxMTNiNDMwNDAiLAogICAgICAgICAgImVuY3J5cHRlZF9rZXkiOiAiSk00UnNXR0M5dVpjd1llRk5NakNPdz09IiwKICAgICAgICAgICJ1c2FnZV9wb2xpY3kiOiAiUG9saWN5IEEiCiAgICAgICAgfSwKICAgICAgICB7CiAgICAgICAgICAiaWQiOiAiOWRiYWNlOWUtNDEwMy00YzUyLTk2YWEtNjMyMjdkYzVmNzczIiwKICAgICAgICAgICJlbmNyeXB0ZWRfa2V5IjogInliTUNkUkRnamgvR215cG9mTVdDa3c9PSIsCiAgICAgICAgICAidXNhZ2VfcG9saWN5IjogIlBvbGljeSBBIgogICAgICAgIH0sCiAgICAgICAgewogICAgICAgICAgImlkIjogImE3NmYwY2E2LThlN2QtNDBkMC04YTM3LTkwNmYzZTI0ZGRlMiIsCiAgICAgICAgICAiZW5jcnlwdGVkX2tleSI6ICJTTnlTSFlEZ3MzYkJtamhPTlh5SmRBPT0iLAogICAgICAgICAgInVzYWdlX3BvbGljeSI6ICJQb2xpY3kgQSIKICAgICAgICB9CiAgICAgIF0KICAgIH0sCiAgICAiY29udGVudF9rZXlfdXNhZ2VfcG9saWNpZXMiOiBbCiAgICAgIHsKICAgICAgICAibmFtZSI6ICJQb2xpY3kgQSIsCiAgICAgICAgInBsYXlyZWFkeSI6IHsKICAgICAgICAgICJtaW5fZGV2aWNlX3NlY3VyaXR5X2xldmVsIjogMTUwLAogICAgICAgICAgInBsYXlfZW5hYmxlcnMiOiBbCiAgICAgICAgICAgICI3ODY2MjdEOC1DMkE2LTQ0QkUtOEY4OC0wOEFFMjU1QjAxQTciCiAgICAgICAgICBdCiAgICAgICAgfQogICAgICB9CiAgICBdCiAgfQp9.SSRguglJk2l3VahbSq8N5O4Qhxv78n2gSL5Za8HZJmk',
    dashH264SingleKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJ2ZXJzaW9uIjogMSwKICAiY29tX2tleV9pZCI6ICI2OWU1NDA4OC1lOWUwLTQ1MzAtOGMxYS0xZWI2ZGNkMGQxNGUiLAogICJtZXNzYWdlIjogewogICAgInR5cGUiOiAiZW50aXRsZW1lbnRfbWVzc2FnZSIsCiAgICAidmVyc2lvbiI6IDIsCiAgICAibGljZW5zZSI6IHsKICAgICAgImFsbG93X3BlcnNpc3RlbmNlIjogdHJ1ZQogICAgfSwKICAgICJjb250ZW50X2tleXNfc291cmNlIjogewogICAgICAiaW5saW5lIjogWwogICAgICAgIHsKICAgICAgICAgICJpZCI6ICI0MDYwYTg2NS04ODc4LTQyNjctOWNiZi05MWFlNWJhZTFlNzIiLAogICAgICAgICAgImVuY3J5cHRlZF9rZXkiOiAid3QzRW51dVI1UkFybjZBRGYxNkNCQT09IiwKICAgICAgICAgICJ1c2FnZV9wb2xpY3kiOiAiUG9saWN5IEEiCiAgICAgICAgfQogICAgICBdCiAgICB9LAogICAgImNvbnRlbnRfa2V5X3VzYWdlX3BvbGljaWVzIjogWwogICAgICB7CiAgICAgICAgIm5hbWUiOiAiUG9saWN5IEEiLAogICAgICAgICJwbGF5cmVhZHkiOiB7CiAgICAgICAgICAibWluX2RldmljZV9zZWN1cml0eV9sZXZlbCI6IDE1MCwKICAgICAgICAgICJwbGF5X2VuYWJsZXJzIjogWwogICAgICAgICAgICAiNzg2NjI3RDgtQzJBNi00NEJFLThGODgtMDhBRTI1NUIwMUE3IgogICAgICAgICAgXQogICAgICAgIH0KICAgICAgfQogICAgXQogIH0KfQ.l8PnZznspJ6lnNmfAE9UQV532Ypzt1JXQkvrk8gFSRw',
    dashH264MultiKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJ2ZXJzaW9uIjogMSwKICAiY29tX2tleV9pZCI6ICI2OWU1NDA4OC1lOWUwLTQ1MzAtOGMxYS0xZWI2ZGNkMGQxNGUiLAogICJtZXNzYWdlIjogewogICAgInR5cGUiOiAiZW50aXRsZW1lbnRfbWVzc2FnZSIsCiAgICAidmVyc2lvbiI6IDIsCiAgICAibGljZW5zZSI6IHsKICAgICAgImFsbG93X3BlcnNpc3RlbmNlIjogdHJ1ZQogICAgfSwKICAgICJjb250ZW50X2tleXNfc291cmNlIjogewogICAgICAiaW5saW5lIjogWwogICAgICAgIHsKICAgICAgICAgICJpZCI6ICI0MjZkMWEzMi03OGZkLTRmMjItODczMC02OGRiMzk3NGRkYTkiLAogICAgICAgICAgImVuY3J5cHRlZF9rZXkiOiAiZjFsLy95M0dnN3pFVE9qM1ZQTXovQT09IiwKICAgICAgICAgICJ1c2FnZV9wb2xpY3kiOiAiUG9saWN5IEEiCiAgICAgICAgfSwKICAgICAgICB7CiAgICAgICAgICAiaWQiOiAiOWRjOGU4MGEtY2JmYS00MWMzLTk4NGYtYjYwNDM0NDAzOTFhIiwKICAgICAgICAgICJlbmNyeXB0ZWRfa2V5IjogInlxOW9pSjJ0QnQ1bkpFM1VENE53bXc9PSIsCiAgICAgICAgICAidXNhZ2VfcG9saWN5IjogIlBvbGljeSBBIgogICAgICAgIH0sCiAgICAgICAgewogICAgICAgICAgImlkIjogIjQxYmFhNTk5LTY5MDUtNGZjMC1hOGM2LTM1NWRjZDFhYjM5ZiIsCiAgICAgICAgICAiZW5jcnlwdGVkX2tleSI6ICJ0ZWhGVGhwK2RpMUFHSHM2eGdySjBRPT0iLAogICAgICAgICAgInVzYWdlX3BvbGljeSI6ICJQb2xpY3kgQSIKICAgICAgICB9CiAgICAgIF0KICAgIH0sCiAgICAiY29udGVudF9rZXlfdXNhZ2VfcG9saWNpZXMiOiBbCiAgICAgIHsKICAgICAgICAibmFtZSI6ICJQb2xpY3kgQSIsCiAgICAgICAgInBsYXlyZWFkeSI6IHsKICAgICAgICAgICJtaW5fZGV2aWNlX3NlY3VyaXR5X2xldmVsIjogMTUwLAogICAgICAgICAgInBsYXlfZW5hYmxlcnMiOiBbCiAgICAgICAgICAgICI3ODY2MjdEOC1DMkE2LTQ0QkUtOEY4OC0wOEFFMjU1QjAxQTciCiAgICAgICAgICBdCiAgICAgICAgfQogICAgICB9CiAgICBdCiAgfQp9.KpLCxibrW87lZwA_CSuZdqj7u0L-lnt-e3z_M1Toas0',
    dashH265SingleKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJ2ZXJzaW9uIjogMSwKICAiY29tX2tleV9pZCI6ICI2OWU1NDA4OC1lOWUwLTQ1MzAtOGMxYS0xZWI2ZGNkMGQxNGUiLAogICJtZXNzYWdlIjogewogICAgInR5cGUiOiAiZW50aXRsZW1lbnRfbWVzc2FnZSIsCiAgICAidmVyc2lvbiI6IDIsCiAgICAibGljZW5zZSI6IHsKICAgICAgImFsbG93X3BlcnNpc3RlbmNlIjogdHJ1ZQogICAgfSwKICAgICJjb250ZW50X2tleXNfc291cmNlIjogewogICAgICAiaW5saW5lIjogWwogICAgICAgIHsKICAgICAgICAgICJpZCI6ICI5ZmQzODVkNS1mMzg5LTQ4YjUtYjdjMy1iMTg2M2VlMTA4ODgiLAogICAgICAgICAgImVuY3J5cHRlZF9rZXkiOiAiS3ZhaytZZVF1NGU2QnRvcEQ2Wm1JUT09IiwKICAgICAgICAgICJ1c2FnZV9wb2xpY3kiOiAiUG9saWN5IEEiCiAgICAgICAgfQogICAgICBdCiAgICB9LAogICAgImNvbnRlbnRfa2V5X3VzYWdlX3BvbGljaWVzIjogWwogICAgICB7CiAgICAgICAgIm5hbWUiOiAiUG9saWN5IEEiLAogICAgICAgICJwbGF5cmVhZHkiOiB7CiAgICAgICAgICAibWluX2RldmljZV9zZWN1cml0eV9sZXZlbCI6IDE1MCwKICAgICAgICAgICJwbGF5X2VuYWJsZXJzIjogWwogICAgICAgICAgICAiNzg2NjI3RDgtQzJBNi00NEJFLThGODgtMDhBRTI1NUIwMUE3IgogICAgICAgICAgXQogICAgICAgIH0KICAgICAgfQogICAgXQogIH0KfQ.CNEEm6UhOFiXadbcxQrs64NEb9ys7YdPZ7TmTO8aTbg',
    dashH265MultiKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJ2ZXJzaW9uIjogMSwKICAiY29tX2tleV9pZCI6ICI2OWU1NDA4OC1lOWUwLTQ1MzAtOGMxYS0xZWI2ZGNkMGQxNGUiLAogICJtZXNzYWdlIjogewogICAgInR5cGUiOiAiZW50aXRsZW1lbnRfbWVzc2FnZSIsCiAgICAidmVyc2lvbiI6IDIsCiAgICAibGljZW5zZSI6IHsKICAgICAgImFsbG93X3BlcnNpc3RlbmNlIjogdHJ1ZQogICAgfSwKICAgICJjb250ZW50X2tleXNfc291cmNlIjogewogICAgICAiaW5saW5lIjogWwogICAgICAgIHsKICAgICAgICAgICJpZCI6ICIzMWJiNjViNC01ODMxLTRjMzQtOTExNC0yNTU5MWJhZTQwNjYiLAogICAgICAgICAgImVuY3J5cHRlZF9rZXkiOiAiWTV2ZDB2aWpvbDExVHFMKytBTFpNZz09IiwKICAgICAgICAgICJ1c2FnZV9wb2xpY3kiOiAiUG9saWN5IEEiCiAgICAgICAgfSwKICAgICAgICB7CiAgICAgICAgICAiaWQiOiAiZDVlM2YzNjctZmM5Ny00Njg1LWFjM2QtMmNjYWI0ZTAxNDhhIiwKICAgICAgICAgICJlbmNyeXB0ZWRfa2V5IjogInhwM1l6TWpQTkFDT2FSeEoxRnJiV3c9PSIsCiAgICAgICAgICAidXNhZ2VfcG9saWN5IjogIlBvbGljeSBBIgogICAgICAgIH0sCiAgICAgICAgewogICAgICAgICAgImlkIjogIjk4MjkzYWE1LWE2M2QtNDA1Ni1hZWI1LWI4ZWJmMmIyMjM3MCIsCiAgICAgICAgICAiZW5jcnlwdGVkX2tleSI6ICJYZmpUZkFqZjYxSk9JK1BuM0hIV0dnPT0iLAogICAgICAgICAgInVzYWdlX3BvbGljeSI6ICJQb2xpY3kgQSIKICAgICAgICB9CiAgICAgIF0KICAgIH0sCiAgICAiY29udGVudF9rZXlfdXNhZ2VfcG9saWNpZXMiOiBbCiAgICAgIHsKICAgICAgICAibmFtZSI6ICJQb2xpY3kgQSIsCiAgICAgICAgInBsYXlyZWFkeSI6IHsKICAgICAgICAgICJtaW5fZGV2aWNlX3NlY3VyaXR5X2xldmVsIjogMTUwLAogICAgICAgICAgInBsYXlfZW5hYmxlcnMiOiBbCiAgICAgICAgICAgICI3ODY2MjdEOC1DMkE2LTQ0QkUtOEY4OC0wOEFFMjU1QjAxQTciCiAgICAgICAgICBdCiAgICAgICAgfQogICAgICB9CiAgICBdCiAgfQp9.8U5sx_tcQOUb86cjqkd5e2leudsnT4BpzY0zTTVAKcA',
};

const createDrmAuth = (token) => ({
    licenseServerUrl: v10LicenseServers,
    headers: [{ id: 1, key: 'X-AxDRM-Message', value: token }],
});

/**
 * Where an example entry should be routed, derived from its URL scheme.
 * Pure — shared by the landing view, the library modal and tests.
 *
 * @param {string} url
 * @returns {{kind: 'srt'|'moq'|'rtmp'|'icecast'|'webrtc-pull'|'webrtc-push'|'manifest', transport: string}}
 */
export function routeExampleUrl(url) {
    const value = String(url ?? '').trim();
    if (value.startsWith('srt://')) {
        return { kind: 'srt', transport: 'srt' };
    }
    if (value.startsWith('moqt://')) {
        return { kind: 'moq', transport: 'moq' };
    }
    if (value.startsWith('rtmp://') || value.startsWith('rtmps://')) {
        return { kind: 'rtmp', transport: 'rtmp' };
    }
    // Icecast mounts are plain HTTP(S) URLs ending in an audio extension.
    if (/\.(mp3|aac|aacp|ogg|oga|opus|flac)(\?|#|$)/i.test(value)) {
        return { kind: 'icecast', transport: 'icecast' };
    }
    const lower = value.toLowerCase();
    if (lower.includes('/whep')) {
        return { kind: 'webrtc-pull', transport: 'webrtc' };
    }
    if (lower.includes('/whip')) {
        return { kind: 'webrtc-push', transport: 'whip' };
    }
    return { kind: 'manifest', transport: 'http' };
}

export const exampleStreams = [
    // --- DASH VOD ---
    {
        name: 'V10: H.264 Multi-Key (DASH)',
        url: 'https://media.axprod.net/TestVectors/MultiKey/Dash_h264_1080p_cenc/manifest.mpd',
        protocol: 'dash',
        type: 'vod',
        source: 'Axinom',
        category: 'DASH VOD',
        drmAuth: createDrmAuth(v10Tokens.dashH264MultiKey),
    },
    {
        name: 'V10: H.265 Clear (CMAF/DASH)',
        url: 'https://media.axprod.net/TestVectors/H265/clear_cmaf_1080p_h265/manifest.mpd',
        protocol: 'dash',
        type: 'vod',
        source: 'Axinom',
        category: 'DASH VOD',
    },

    // --- DASH Live ---
    {
        name: 'DASH-IF: Live Simulation',
        url: 'https://livesim2.dashif.org/livesim2/testpic_2s/Manifest.mpd',
        protocol: 'dash',
        type: 'live',
        source: 'DASH-IF',
        category: 'DASH Live',
    },
    {
        name: 'DASH-IF: SCTE-35 Ad Insertion (Live)',
        url: 'https://livesim2.dashif.org/livesim2/scte35_2/testpic_2s/Manifest.mpd?url_append_rand=1',
        protocol: 'dash',
        type: 'live',
        source: 'DASH-IF',
        category: 'DASH Live',
    },
    {
        name: 'DASH-IF: Complex Feature Test (Live)',
        url: 'https://livesim2.dashif.org/livesim2/periods_3/chunkdur_0.2/ato_inf/drm_eccp-cbcs/scte35_1/utc_direct/testpic_2s/Manifest.mpd?url_append_rand=1',
        protocol: 'dash',
        type: 'live',
        source: 'DASH-IF',
        category: 'DASH Live',
    },
    {
        name: 'DASH-IF: Live Simulation',
        url: 'https://livesim.dashif.org/livesim/testpic_2s/Manifest.mpd',
        protocol: 'dash',
        type: 'live',
        source: 'DASH-IF',
        category: 'DASH Live',
    },

    // --- HLS VOD ---
    {
        name: 'Big Buck Bunny (fMP4)',
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        protocol: 'hls',
        type: 'vod',
        category: 'HLS VOD',
    },
    {
        name: 'V10: H.265 Clear (CMAF/HLS)',
        url: 'https://media.axprod.net/TestVectors/H265/clear_cmaf_1080p_h265/manifest.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'Axinom',
        category: 'HLS VOD',
    },
    {
        name: 'Apple: BipBop (HEVC + AVC)',
        url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'Apple',
        category: 'HLS VOD',
    },
    {
        name: 'Apple: Advanced stream',
        url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/adv_dv_atmos/main.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'Apple',
        category: 'HLS VOD',
    },

    // --- SRT (Secure Reliable Transport) ---
    // Public contribution beacons: continuously running UTC-timecode test
    // signals. Sessions are capped (~30 min) by the provider; no account.
    // Analysis requires the local helper binary (see README).
    {
        name: 'IN/OUT-SRT: LL contribution beacon (DE)',
        url: 'srt://de.inoutsrt.com:6999?streamid=read:beacon&latency=200',
        protocol: 'srt',
        type: 'live',
        source: 'IN/OUT-SRT',
        category: 'SRT',
        verified: '2026-10-14',
        notes: 'Caller-mode pull over the public internet; exercise the helper, the synthetic façade and the SRT rule family.',
    },
    {
        name: 'IN/OUT-SRT: LL contribution beacon (USA)',
        url: 'srt://usa.inoutsrt.com:6999?streamid=read:beacon&latency=200',
        protocol: 'srt',
        type: 'live',
        source: 'IN/OUT-SRT',
        category: 'SRT',
        verified: '2026-10-14',
        notes: 'Second edge node: compare RTT/retransmission behavior between the DE and USA legs.',
    },

    // --- Low Latency (LL-HLS / LL-DASH) ---
    {
        name: 'OvenMediaEngine: LL-HLS live demo',
        url: 'https://llhls-demo.ovenmediaengine.com/app/stream/llhls.m3u8',
        protocol: 'hls',
        type: 'live',
        source: 'OvenMediaEngine',
        category: 'Low Latency',
        verified: '2026-10-14',
        notes: 'Textbook LL-HLS: 12 EXT-X-PART per variant, PART-TARGET 1.0s, CAN-BLOCK-RELOAD=YES, PART-HOLD-BACK 3.0s, EXT-X-PROGRAM-DATE-TIME, multiple renditions plus audio/subtitle groups.',
    },
    {
        name: 'Akamai: CMAF ultra-low-latency DASH',
        url: 'https://cmafref.akamaized.net/cmaf/live-ull/2006350/akambr/out.mpd',
        protocol: 'dash',
        type: 'live',
        source: 'Akamai (CMAF reference)',
        category: 'Low Latency',
        verified: '2026-10-14',
        notes: 'LL-DASH reference stream used by the dash.js low-latency testplayer; carries ServiceDescription/Latency (target 3000 ms). Feeds the Low-Latency analysis view.',
    },

    // --- MSS (IIS Smooth Streaming) ---
    {
        name: 'Unified Streaming: Tears of Steel (MSS)',
        url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/Manifest',
        protocol: 'mss',
        type: 'vod',
        source: 'Unified Streaming Platform',
        category: 'MSS VOD',
        verified: '2026-10-15',
        notes: 'Smooth Streaming client manifest with audio (AAC) + video (5 renditions), StreamIndex Url templates with name-qualified {start time} placeholders, and explicit t on the first chunk.',
    },
    {
        name: 'DirectTaps: Super Speedway 720p (MSS, classic IIS)',
        url: 'https://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest',
        protocol: 'mss',
        type: 'vod',
        source: 'DirectTaps (PlayReady test)',
        category: 'MSS VOD',
        verified: '2026-10-15',
        notes: 'Classic IIS-style manifest: d-only chunk runs, no TimeScale, hex CodecPrivateData. Its chunk timeline sums to 120.787 s while Duration says 120.951 s — the analyzer reports that mismatch instead of hiding it.',
    },

    // --- Icecast / SHOUTcast (internet radio) ---
    {
        name: 'Classic FM: live classical radio (Dax/Icecast)',
        url: 'http://icecast.thisisdax.com/ClassicFM',
        protocol: 'icecast',
        type: 'live',
        source: 'thisisdax (Icecast 2.4)',
        category: 'Icecast',
        verified: '2026-10-15',
        notes: 'AAC 48 kbps with ICY in-band metadata (icy-metaint 8000): the monitor decodes StreamTitle blocks live — titles arrive about every 1.3 s. Readable from the browser because the station allows CORS.',
    },
    {
        // Radio Paradise serves no icy-br and no in-band metadata: the
        // honest-null path on the measured-rate view.
        name: 'Radio Paradise: MP3 192 (no in-band metadata)',
        url: 'http://stream.radioparadise.com/mp3-192',
        protocol: 'icecast',
        type: 'live',
        source: 'Radio Paradise',
        category: 'Icecast',
        verified: '2026-10-15',
        notes: 'MP3 without ICY metadata headers: the panel reports the measured rate (~197 kbps) and leaves advertised rate/efficiency null instead of guessing.',
    },

    // --- MoQ (Media over QUIC) ---
    // No public relay speaks draft-22 yet: Cloudflare (draft-14/-16) and
    // cdn.moq.dev still use the pre-16 0x20 CLIENT_SETUP message shape and
    // never answer a draft-22 SETUP (verified live). The bundled relay is the
    // only end-to-end source for this client — start it before clicking.
    {
        name: 'Bundled MoQ test relay (local)',
        url: 'moqt://127.0.0.1:4430/anon',
        protocol: 'moq',
        type: 'live',
        source: 'bundled test relay (tools/moq-testrelay)',
        category: 'MoQ',
        verified: '2026-10-14',
        notes: 'Start with: go run ./tools/moq-testrelay -addr :4430 (self-signed dev certificate, pinned by the browser for loopback — no browser flags needed). Demonstrates the SETUP exchange, SUBSCRIBE/OK round trip with measured RTT, an MSF catalog over an OBJECT_DATAGRAM and objects on a subgroup stream — end-to-end over real WebTransport/QUIC.',
    },
    {
        // Cloudflare's public draft-16 relay. The URL path carries the
        // published subscribe token, so the broadcast namespace is explicit.
        name: 'Cloudflare MoQ: draft-16 relay (/bbb)',
        url: 'https://draft-16.cloudflare.mediaoverquic.com/eyJhbGciOiJFZERTQSIsImtpZCI6Im1vcS12MSIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJtb3EuY2xvdWRmbGFyZS5jb20iLCJleHAiOjE4MTY0NDA0NTcsImlhdCI6MTc4NDkwNDQ1OCwiaXNzIjoiY2xvdWRmbGFyZSIsImp0aSI6IjgxMTc4MjIyZmIzNTVjMDQ3YmM0MDNkODQ2NWI0YWIzIiwib3BlcmF0aW9ucyI6WyJzdWJzY3JpYmUiXSwic3ViIjoiZWJkMWZlZDdhZjMzNzYzMjc3MDc0ODQ0NThmYWIxZmEifQ.VlTscBfWmjSybWx1NpmF0f1g5Gtfxg5H4rkUQQa2JHATtjGwO5iwl71DAS5kJ98-3ukPvmGe9RE7peYs_dqgCg',
        protocol: 'moq',
        type: 'live',
        source: 'Cloudflare (public demo relay)',
        category: 'MoQ',
        namespace: ['bbb'],
        verified: '2026-10-14',
        notes: 'The only public relay that speaks a dialect this client implements (draft-16, auto-negotiated). URL path is the published subscribe token, hence the explicit namespace. Wire-level interop verified live (SETUP, TRACK_STATUS, SUBSCRIBE answered by their independent implementation); at verification time the /bbb namespace had no active publisher — TRACK_STATUS reports “track not found”, so expect a REQUEST_ERROR rather than media until Cloudflare republishes the demo.',
    },
];
