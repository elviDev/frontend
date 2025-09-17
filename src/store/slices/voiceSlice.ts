import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { VoiceState, VoiceCommand } from '../../types/voice';

const initialState: VoiceState = {
  isListening: false,
  isProcessing: false,
  transcript: '',
  error: null,
  lastCommand: null,
};

export const voiceSlice = createSlice({
  name: 'voice',
  initialState,
  reducers: {
    startListening: (state) => {
      state.isListening = true;
      state.error = null;
      state.transcript = '';
    },
    stopListening: (state) => {
      state.isListening = false;
    },
    setTranscript: (state, action: PayloadAction<string>) => {
      state.transcript = action.payload;
    },
    startProcessing: (state) => {
      state.isProcessing = true;
      state.error = null;
    },
    stopProcessing: (state) => {
      state.isProcessing = false;
    },
    setLastCommand: (state, action: PayloadAction<VoiceCommand>) => {
      state.lastCommand = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isListening = false;
      state.isProcessing = false;
    },
    clearVoiceState: (state) => {
      state.transcript = '';
      state.error = null;
      state.lastCommand = null;
    },
  },
});

export const {
  startListening,
  stopListening,
  setTranscript,
  startProcessing,
  stopProcessing,
  setLastCommand,
  setError,
  clearVoiceState,
} = voiceSlice.actions;

export default voiceSlice.reducer;