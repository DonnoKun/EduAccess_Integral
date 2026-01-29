/**
 * EduAccess - Visual Settings Reset Utility
 * Cleans up all visual settings on logout for privacy
 */

export function resetVisualSettingsToDefault() {
  console.log('🧹 Resetting all visual settings to defaults...');
  
  // 1. Reset CSS variables to default values
  const root = document.documentElement;
  root.style.setProperty('--profile-font-size', '16px');
  root.style.setProperty('--profile-line-height', '1.5');
  root.style.setProperty('--animation-duration', '300ms');
  
  // 2. Reset body styles
  document.body.style.fontSize = '';
  document.body.style.lineHeight = '';
  
  // 3. Reset theme to light
  root.setAttribute('data-theme', 'light');
  root.classList.remove('dark', 'high-contrast', 'inverted');
  
  // 4. Remove user profile attribute
  root.removeAttribute('data-user-profile');
  
  // 5. Remove any additional visual filters
  root.style.removeProperty('filter');
  root.style.removeProperty('transform');
  
  console.log('✅ Visual settings reset complete:', {
    fontSize: getComputedStyle(root).getPropertyValue('--profile-font-size'),
    lineHeight: getComputedStyle(root).getPropertyValue('--profile-line-height'),
    theme: root.getAttribute('data-theme'),
    classes: root.classList.toString(),
  });
}

export function clearAllUserData() {
  console.log('🗑️ Clearing all user data from localStorage...');
  
  // Remove the persisted Zustand stores
  localStorage.removeItem('eduaccess-storage');
  localStorage.removeItem('eduaccess-auth');
  
  // Remove any additional user-specific data
  const keysToRemove = [
    'visualProfile',
    'theme',
    'currentUser',
    'authToken',
    'onboardingCompleted',
  ];
  
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`  Removed: ${key}`);
    }
  });
  
  // Keep language preference (optional UX choice)
  // localStorage.removeItem('i18nextLng');
  
  console.log('✅ User data cleared');
}
