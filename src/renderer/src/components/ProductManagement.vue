<template>
  <div class="product-management">
    <h1>Gestão de Produtos</h1>

    <div class="card">
      <h2>{{ isEditing ? 'Editar Produto' : 'Adicionar Produto' }}</h2>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="name">Nome:</label>
          <input type="text" id="name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="price">Preço:</label>
          <input type="number" id="price" v-model.number="form.price" step="0.01" required />
        </div>
        <div class="form-group">
          <label for="quantity">Quantidade:</label>
          <input type="number" id="quantity" v-model.number="form.quantity" required />
        </div>
        <div class="form-actions">
          <button type="submit">{{ isEditing ? 'Atualizar' : 'Adicionar' }}</button>
          <button type="button" @click="resetForm" v-if="isEditing">Cancelar</button>
        </div>
      </form>
    </div>

    <div class="card">
      <h2>Lista de Produtos</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>Preço</th>
            <th>Quantidade</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id">
            <td>{{ product.id }}</td>
            <td>{{ product.name }}</td>
            <td>{{ formatCurrency(product.price) }}</td>
            <td>{{ product.quantity }}</td>
            <td>
              <button @click="handleEdit(product)">Editar</button>
              <button @click="handleDelete(product.id)">Excluir</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Product } from '../../../preload/index.d'

const products = ref<Product[]>([])
const isEditing = ref(false)
const form = ref<Omit<Product, 'id'> & { id?: number }>({
  name: '',
  price: 0,
  quantity: 0
})

const fetchProducts = async () => {
  products.value = await window.api.getProducts()
}

onMounted(fetchProducts)

const handleSubmit = async () => {
  if (isEditing.value && form.value.id) {
    const updatedProduct = {
      id: form.value.id,
      name: form.value.name,
      price: form.value.price,
      quantity: form.value.quantity
    }
    await window.api.updateProduct(updatedProduct)
  } else {
    const newProduct: Omit<Product, 'id'> = {
      name: form.value.name,
      price: form.value.price,
      quantity: form.value.quantity
    }
    await window.api.addProduct(newProduct)
  }
  resetForm()
  await fetchProducts()
}

const handleEdit = (product: Product) => {
  isEditing.value = true
  form.value = { ...product }
}

const handleDelete = async (id: number) => {
  if (confirm('Tem certeza que deseja excluir este produto?')) {
    await window.api.deleteProduct(id)
    await fetchProducts()
  }
}

const resetForm = () => {
  isEditing.value = false
  form.value = { name: '', price: 0, quantity: 0 }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
</script>

<style scoped>
.product-management {
  padding: 20px;
  font-family: sans-serif;
}
.card {
  background: #f4f4f4;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
}
.form-group input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}
.form-actions button {
  margin-right: 10px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
th {
  background-color: #e4e4e4;
}
</style>
