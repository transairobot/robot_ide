<template>
  <div class="h-full flex flex-col">
    <!-- Tab Header -->
    <div class="px-3 py-2 border-b border-border bg-muted/50">
      <h3 class="text-sm font-medium text-foreground">LLM Chat</h3>
    </div>
    <ScrollArea class="flex-1 p-2">
      <div
        v-for="message in chatMessages"
        :key="message.id"
        :class="[
          'p-3 mb-2 rounded-lg border',
          message.role === 'user' 
            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50 self-end max-w-[80%]' 
            : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800/50 max-w-[80%]'
        ]"
      >
        <div
          :class="[
            'text-sm whitespace-pre-wrap',
            message.role === 'user' ? 'text-blue-800 dark:text-blue-200 text-right' : 'text-green-800 dark:text-green-200'
          ]"
        >
          {{ message.content }}
        </div>
        <div 
          :class="[
            'text-xs mt-1',
            message.role === 'user' 
              ? 'text-blue-600 dark:text-blue-400 text-right' 
              : 'text-green-600 dark:text-green-400'
          ]"
        >
          {{ message.role === 'user' ? 'You' : 'LLM Assistant' }}
        </div>
      </div>
    </ScrollArea>
    <div class="p-3 border-t border-border">
      <div class="flex gap-2">
        <Input
          v-model="userInput"
          placeholder="Type a message..."
          class="flex-1 h-8 text-sm"
          @keyup.enter="handleSendMessage"
        />
        <Button 
          size="sm" 
          class="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white"
          @click="handleSendMessage"
        >
          Send
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import ScrollArea from '@/components/ui/ScrollArea.vue'

interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

const userInput = ref('')

// Chat messages state
const chatMessages = ref<ChatMessage[]>([
  {
    id: '1',
    content: 'Hello! I am your robot assistant. How can I help you today?',
    role: 'assistant',
    timestamp: new Date()
  }
])

// Wrapper function for sending message
const handleSendMessage = () => {
  sendMessage()
}

// Function to send message to LLM
const sendMessage = async () => {
  console.log("user.Input=", userInput.value)
  if (!userInput.value.trim()) return

  // Store user input before clearing it
  const currentInput = userInput.value
  
  // Add user message to chat
  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    content: currentInput,
    role: 'user',
    timestamp: new Date()
  }
  
  chatMessages.value.push(userMessage)
  
  // Clear the input field
  userInput.value = ''
  
  try {
    // Add a placeholder for the assistant's response
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      content: '...',
      role: 'assistant',
      timestamp: new Date()
    }
    
    chatMessages.value.push(assistantMessage)
    
    // Scroll to bottom to show the new message
    await nextTick()
    
    // Simulate API call to LLM
    // In a real application, you would replace this with an actual API call
    const response = await callLLM(currentInput)
    
    // Update the assistant's message with the actual response
    const messageIndex = chatMessages.value.findIndex(msg => msg.id === assistantMessageId)
    if (messageIndex !== -1) {
      chatMessages.value[messageIndex].content = response
    }
  } catch (error) {
    // Handle error
    const errorMessage: ChatMessage = {
      id: (Date.now() + 2).toString(),
      content: 'Sorry, I encountered an error while processing your request.',
      role: 'assistant',
      timestamp: new Date()
    }
    
    chatMessages.value.push(errorMessage)
  }
}

// Mock function to simulate calling an LLM API
const callLLM = async (query: string): Promise<string> => {
  // In a real application, you would make an HTTP request to your LLM API
  // For now, we'll simulate a response
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Return a mock response based on the query
  const responses: Record<string, string> = {
    'hello': 'Hello! How can I assist you with your robot simulation today?',
    'help': 'I can help you with robot programming, simulation scenarios, and troubleshooting. What do you need help with?',
    'path planning': 'For path planning, you can use the Path Planning app in the Apps section. It provides advanced algorithms for navigation.',
    'simulation': 'To run a simulation, make sure your robot is properly configured and then click the Start button in the toolbar.',
    'robot': 'What would you like to know about your robot? I can provide information about its capabilities, status, or help you configure it.'
  }
  
  // Find a matching response or provide a default one
  const lowerQuery = query.toLowerCase()
  for (const [key, response] of Object.entries(responses)) {
    if (lowerQuery.includes(key)) {
      return response
    }
  }
  
  // Default response
  return `I received your message: "${query}". I'm here to help with your robot simulation. You can ask me about path planning, robot configuration, or simulation scenarios.`
}
</script>
