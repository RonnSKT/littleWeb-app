<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import ProductManagement from './components/ProductManagement.vue'
import POS from './components/POS.vue'
import type { Theme } from '../../../preload/index.d'

type View = 'pos' | 'products'

const currentView = ref<View>('pos')
const themes = ref<Theme[]>([])
const currentThemeName = ref<string>('Light')

const views = {
  pos: POS,
  products: ProductManagement
}

const currentComponent = computed(() => views[currentView.value])

const applyTheme = (themeName: string) => {
  const theme = themes.value.find((t) => t.name === themeName)
  if (!theme) {
    console.error(`Theme "${themeName}" not found.`)
    return
  }
  for (const [key, value] of Object.entries(theme.colors)) {
    document.documentElement.style.setProperty(key, value)
  }
  localStorage.setItem('theme', themeName)
  currentThemeName.value = themeName
}

watch(currentThemeName, (newThemeName) => {
  applyTheme(newThemeName)
})

onMounted(async () => {
  const fetchedThemes = await window.api.themes.get()
  themes.value = fetchedThemes

  const savedThemeName = localStorage.getItem('theme')
  if (savedThemeName && themes.value.some(t => t.name === savedThemeName)) {
    currentThemeName.value = savedThemeName
  } else {
    currentThemeName.value = 'Light' // Default theme
  }

  applyTheme(currentThemeName.value)

  window.api.themes.onThemeAdded((theme) => {
    themes.value.push(theme)
  })
})
</script>

<template>
  <div>
    <nav>
      <div class="tabs">
        <button @click="currentView = 'pos'" :class="{ active: currentView === 'pos' }">PDV</button>
        <button @click="currentView = 'products'" :class="{ active: currentView === 'products' }">
          Gerenciar Produtos
        </button>
      </div>
      <div class="theme-switcher">
        <label for="theme-select">Tema:</label>
        <select id="theme-select" v-model="currentThemeName">
          <option v-for="theme in themes" :key="theme.name" :value="theme.name">
            {{ theme.name }}
          </option>
        </select>
      </div>
    </nav>
    <main>
      <component :is="currentComponent"></component>
    </main>
  </div>
</template>

<style>
/* Styles moved to main.css, but we can add specific component styles here if needed */
.theme-switcher {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.theme-switcher label {
  color: var(--color-text-nav);
}
.theme-switcher select {
  padding: 0.25rem;
  border-radius: 4px;
}
</style>
