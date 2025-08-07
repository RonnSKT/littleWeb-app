module.exports = {
  name: 'High Contrast Theme',
  initialize: (api) => {
    console.log('Initializing High Contrast Theme Plugin...');

    const highContrastTheme = {
      '--color-background': '#000000',
      '--color-background-nav': '#000000',
      '--color-background-card': '#111111',
      '--color-text-primary': '#ffffff',
      '--color-text-secondary': '#dddddd',
      '--color-text-nav': '#ffffff',
      '--color-primary': '#ffff00',
      '--color-border': '#ffffff',
      '--color-button-text': '#000000',
    };

    api.registerTheme('High Contrast', highContrastTheme);
  },
};
