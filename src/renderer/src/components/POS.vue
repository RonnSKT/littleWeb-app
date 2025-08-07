<template>
  <div class="pos-container">
    <h1>Ponto de Venda (PDV)</h1>
    <div class="pos-main">
      <div class="product-list card">
        <h2>Produtos Disponíveis</h2>
        <ul>
          <li v-for="product in availableProducts" :key="product.id" @click="addToCart(product)">
            <span>{{ product.name }}</span>
            <span>{{ formatCurrency(product.price) }}</span>
            <span>(Estoque: {{ product.quantity }})</span>
          </li>
        </ul>
      </div>

      <div class="cart card">
        <h2>Carrinho</h2>
        <ul>
          <li v-for="item in cart" :key="item.id">
            <span>{{ item.name }} ({{ item.quantity }}x)</span>
            <span>{{ formatCurrency(item.price * item.quantity) }}</span>
            <button @click="removeFromCart(item.id)">Remover</button>
          </li>
        </ul>
        <div class="cart-total" v-if="cart.length > 0">
          <h3>Total: {{ formatCurrency(totalAmount) }}</h3>
          <button @click="finalizeSale" :disabled="isFinalizing">
            {{ isFinalizing ? 'Finalizando...' : 'Finalizar Venda' }}
          </button>
        </div>
        <p v-else>O carrinho está vazio.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { Product, CartItem } from '../../../preload/index.d'

const allProducts = ref<Product[]>([])
const cart = ref<CartItem[]>([])
const isFinalizing = ref(false)

const fetchProducts = async () => {
  allProducts.value = await window.api.getProducts()
}

onMounted(fetchProducts)

const availableProducts = computed(() => {
  return allProducts.value.filter(p => p.quantity > 0)
})

const totalAmount = computed(() => {
  return cart.value.reduce((total, item) => total + item.price * item.quantity, 0)
})

const addToCart = (product: Product) => {
  const existingItem = cart.value.find(item => item.id === product.id)
  const productInStock = allProducts.value.find(p => p.id === product.id)

  if (!productInStock || productInStock.quantity <= (existingItem?.quantity || 0)) {
    alert('Produto sem estoque suficiente.')
    return;
  }

  if (existingItem) {
    existingItem.quantity++
  } else {
    cart.value.push({ ...product, quantity: 1 })
  }
}

const removeFromCart = (productId: number) => {
  const itemIndex = cart.value.findIndex(item => item.id === productId)
  if (itemIndex > -1) {
    const item = cart.value[itemIndex]
    if (item.quantity > 1) {
      item.quantity--
    } else {
      cart.value.splice(itemIndex, 1)
    }
  }
}

const finalizeSale = async () => {
  if (cart.value.length === 0) {
    alert('O carrinho está vazio.')
    return
  }

  isFinalizing.value = true
  try {
    const payload = {
      cartItems: cart.value,
      totalAmount: totalAmount.value
    }
    const result = await window.api.finalizeSale(payload)
    alert(`Venda #${result.saleId} finalizada com sucesso!`)
    cart.value = []
    await fetchProducts() // Refresh product list to show new stock
  } catch (error) {
    console.error('Erro ao finalizar a venda:', error)
    alert('Ocorreu um erro ao finalizar a venda.')
  } finally {
    isFinalizing.value = false
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
</script>

<style scoped>
.pos-container {
  padding: 20px;
}
.pos-main {
  display: flex;
  gap: 20px;
}
.product-list, .cart {
  flex: 1;
}
.card {
  background: #f4f4f4;
  padding: 20px;
  border-radius: 8px;
}
.product-list ul, .cart ul {
  list-style: none;
  padding: 0;
}
.product-list li {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
}
.product-list li:hover {
  background-color: #e9e9e9;
}
.cart li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #ddd;
}
.cart-total {
  margin-top: 20px;
  text-align: right;
}
</style>
