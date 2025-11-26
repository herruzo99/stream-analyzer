export const PATCH_PRESETS = [
    {
        id: 'force-https',
        label: 'Force HTTPS',
        description: 'Replace all http:// schemes with https://',
        rules: [
            {
                type: 'regex',
                target: 'http://',
                replacement: 'https://',
                active: true,
            },
        ],
    },
    {
        id: 'force-http',
        label: 'Force HTTP',
        description: 'Replace all https:// schemes with http://',
        rules: [
            {
                type: 'regex',
                target: 'https://',
                replacement: 'http://',
                active: true,
            },
        ],
    },
    {
        id: 'proxy-segments',
        label: 'Proxy Segments (Localhost)',
        description: 'Prepend a local proxy URL to all absolute segment paths',
        rules: [
            {
                type: 'regex',
                target: '(https?://)',
                replacement: 'http://localhost:8080/proxy?url=$1',
                active: true,
            },
        ],
    },
    {
        id: 'remove-drm',
        label: 'Strip DRM Signaling',
        description:
            'Remove ContentProtection elements (DASH) or EXT-X-KEY tags (HLS)',
        rules: [
            {
                type: 'regex',
                target: '<ContentProtection[\\s\\S]*?/>',
                replacement: '',
                active: true,
            },
            {
                type: 'regex',
                target: '<ContentProtection[\\s\\S]*?>[\\s\\S]*?</ContentProtection>',
                replacement: '',
                active: true,
            },
            {
                type: 'regex',
                target: '#EXT-X-KEY:.*',
                replacement: '',
                active: true,
            },
        ],
    },
    {
        id: 'hls-rel-to-abs',
        label: 'HLS: Force Absolute Paths',
        description:
            'Attempts to prefix lines starting with "/" with a base URL placeholder.',
        rules: [
            {
                type: 'regex',
                target: '^/',
                replacement: 'https://example.com/',
                active: true,
            },
        ],
    },
];
