<script setup lang="ts">
import { useRouter } from 'vue-router';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Icon from '@/components/ui/Icon.vue';

const router = useRouter();
</script>

<template>
  <div class="container container-narrow" style="padding: 96px 24px; text-align: center">
    <Card pad="lg">
      <Icon name="x" :size="24" style="color: var(--danger); margin-bottom: 8px" />
      <h1 class="h2" style="margin: 0 0 8px">Page not found</h1>
      <p class="muted" style="font-size: 13px">The page you're looking for doesn't exist.</p>
      <Button variant="primary" style="margin-top: 16px" @click="router.push('/')">
        Back home
      </Button>
    </Card>
  </div>
</template>
