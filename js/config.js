export const PPI = 96;

export const allTerrains = ['sea', 'plains', 'swamp', 'snow', 'desert', 'wasteland'];

export const allAddons = ['Town', 'City', 'Dungeon', 'Tower', 'Mountain', 'Encampment'];

export const iconSvgs = {
    'town': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black"><path d="M4 11V21H9V16H11V21H16V11L10 6L4 11ZM17 11L22 15V21H18V13.8L17 13V11Z"/></svg>',
    'city': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black"><path d="M2,21H22V19H21V11C21,10.45 20.55,10 20,10H19V7C19,6.45 18.55,6 18,6H11V3C11,2.45 10.55,2 10,2H4C3.45,2 3,2.45 3,3V19H2V21M5,4H9V19H5V4M11,8H17V19H11V8M19,12H20V19H19V12Z"/></svg>',
    'dungeon': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black"><path d="M12,2A10,10 0 0,0 2,12V22H22V12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12V20H18V12H16V20H14V12H10V20H8V12H6V20H4V12A8,8 0 0,1 12,4Z"/></svg>',
    'tower': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black"><path d="M5,21V19H7V11L8,7V3H10V5H12V3H14V5H16V3H18V7L19,11V19H21V21H5M9,19H15V11L14,8H10L9,11V19Z"/></svg>',
    'mountain': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black"><path d="M14,6L10.25,11L13.1,14.8L11.5,16C9.81,13.75 7,10 7,10L1,18H23L14,6Z"/></svg>',
    'encampment': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black"><path d="M12,2L2,22H22L12,2M12,6L19,20H16L12,12L8,20H5L12,6Z"/></svg>'
};

export const minClusterSizes = {
    'sea': 5,
    'plains': 10,
    'swamp': 3,
    'snow': 1,
    'desert': 3,
    'wasteland': 3,
    'default': 1
};
