/**
 * A curated list of public DASH & HLS streams for testing and demonstration purposes.
 * Verified as of late 2025.
 * @typedef {'dash' | 'hls'} Protocol
 * @typedef {'vod' | 'live'} StreamType
 * @typedef {object} ExampleStream
 * @property {string} name - A descriptive name for the stream.
 * @property {string} url - The manifest URL.
 * @property {Protocol} protocol - The streaming protocol.
 * @property {StreamType} type - The stream type (VOD or Live).
 * @property {string} source - The provider of the stream.
 * @property {string} category - A sub-category for better organization.
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
];
