import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Announcement, CreateAnnouncementData, UpdateAnnouncementData, AnnouncementFilter } from '../../types/announcement.types';
import { SEED_ANNOUNCEMENTS } from '../../data/seedData';

// Mock API service - replace with actual API calls
const mockAnnouncementService = {
  async getAnnouncements(filters?: AnnouncementFilter): Promise<{ data: Announcement[]; total: number }> {
    // Mock implementation - replace with actual API call
    return { data: SEED_ANNOUNCEMENTS, total: SEED_ANNOUNCEMENTS.length };
  },

  async createAnnouncement(data: CreateAnnouncementData): Promise<Announcement> {
    // Mock implementation - replace with actual API call
    const newAnnouncement: Announcement = {
      id: `announce-${Date.now()}`,
      ...data,
      published: data.published ?? false,
      createdBy: 'current-user-id',
      createdAt: new Date(),
      readBy: []
    };
    return newAnnouncement;
  },

  async updateAnnouncement(id: string, data: UpdateAnnouncementData): Promise<Announcement> {
    // Mock implementation - replace with actual API call
    const existing = SEED_ANNOUNCEMENTS.find(a => a.id === id);
    if (!existing) throw new Error('Announcement not found');
    
    return { ...existing, ...data, updatedAt: new Date() };
  },

  async deleteAnnouncement(id: string): Promise<void> {
    // Mock implementation - replace with actual API call
    console.log('Deleting announcement:', id);
  },

  async markAsRead(id: string, userId: string): Promise<void> {
    // Mock implementation - replace with actual API call
    console.log('Marking announcement as read:', id, userId);
  }
};

// Async thunks
export const fetchAnnouncements = createAsyncThunk(
  'announcements/fetchAnnouncements',
  async (filters?: AnnouncementFilter) => {
    const response = await mockAnnouncementService.getAnnouncements(filters);
    return response;
  }
);

export const createAnnouncement = createAsyncThunk(
  'announcements/createAnnouncement',
  async (data: CreateAnnouncementData) => {
    const response = await mockAnnouncementService.createAnnouncement(data);
    return response;
  }
);

export const updateAnnouncement = createAsyncThunk(
  'announcements/updateAnnouncement',
  async ({ id, data }: { id: string; data: UpdateAnnouncementData }) => {
    const response = await mockAnnouncementService.updateAnnouncement(id, data);
    return response;
  }
);

export const deleteAnnouncement = createAsyncThunk(
  'announcements/deleteAnnouncement',
  async (id: string) => {
    await mockAnnouncementService.deleteAnnouncement(id);
    return id;
  }
);

export const markAnnouncementAsRead = createAsyncThunk(
  'announcements/markAsRead',
  async ({ id, userId }: { id: string; userId: string }) => {
    await mockAnnouncementService.markAsRead(id, userId);
    return { id, userId };
  }
);

// State interface
interface AnnouncementState {
  announcements: Announcement[];
  userAnnouncements: Announcement[]; // Announcements visible to current user
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;
  activeFilters: AnnouncementFilter;
  unreadCount: number;
  selectedAnnouncement: Announcement | null;
}

const initialState: AnnouncementState = {
  announcements: [],
  userAnnouncements: [],
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  error: null,
  activeFilters: {},
  unreadCount: 0,
  selectedAnnouncement: null,
};

const announcementSlice = createSlice({
  name: 'announcements',
  initialState,
  reducers: {
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    setActiveFilters: (state, action: PayloadAction<AnnouncementFilter>) => {
      state.activeFilters = action.payload;
    },
    
    clearFilters: (state) => {
      state.activeFilters = {};
    },
    
    selectAnnouncement: (state, action: PayloadAction<Announcement | null>) => {
      state.selectedAnnouncement = action.payload;
    },
    
    // Real-time updates
    announcementCreatedRealtime: (state, action: PayloadAction<Announcement>) => {
      const announcement = action.payload;
      state.announcements.unshift(announcement);
      
      // Add to user announcements if it's targeted to the user
      if (shouldShowToUser(announcement, 'current-user-role')) {
        state.userAnnouncements.unshift(announcement);
        if (!announcement.readBy.includes('current-user-id')) {
          state.unreadCount += 1;
        }
      }
    },
    
    announcementUpdatedRealtime: (state, action: PayloadAction<Announcement>) => {
      const updatedAnnouncement = action.payload;
      
      // Update in announcements array
      const index = state.announcements.findIndex(a => a.id === updatedAnnouncement.id);
      if (index !== -1) {
        state.announcements[index] = updatedAnnouncement;
      }
      
      // Update in user announcements array
      const userIndex = state.userAnnouncements.findIndex(a => a.id === updatedAnnouncement.id);
      if (userIndex !== -1) {
        if (shouldShowToUser(updatedAnnouncement, 'current-user-role')) {
          state.userAnnouncements[userIndex] = updatedAnnouncement;
        } else {
          // Remove if no longer targeted to user
          state.userAnnouncements.splice(userIndex, 1);
        }
      } else if (shouldShowToUser(updatedAnnouncement, 'current-user-role')) {
        // Add if newly targeted to user
        state.userAnnouncements.unshift(updatedAnnouncement);
        if (!updatedAnnouncement.readBy.includes('current-user-id')) {
          state.unreadCount += 1;
        }
      }
      
      // Update selected announcement
      if (state.selectedAnnouncement?.id === updatedAnnouncement.id) {
        state.selectedAnnouncement = updatedAnnouncement;
      }
    },
    
    announcementDeletedRealtime: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      
      // Remove from announcements
      state.announcements = state.announcements.filter(a => a.id !== id);
      
      // Remove from user announcements and update unread count
      const userAnnouncementIndex = state.userAnnouncements.findIndex(a => a.id === id);
      if (userAnnouncementIndex !== -1) {
        const announcement = state.userAnnouncements[userAnnouncementIndex];
        if (!announcement.readBy.includes('current-user-id')) {
          state.unreadCount -= 1;
        }
        state.userAnnouncements.splice(userAnnouncementIndex, 1);
      }
      
      // Clear selected if it's the deleted one
      if (state.selectedAnnouncement?.id === id) {
        state.selectedAnnouncement = null;
      }
    },
    
    updateUnreadCount: (state) => {
      state.unreadCount = state.userAnnouncements.filter(
        a => !a.readBy.includes('current-user-id')
      ).length;
    },
  },
  
  extraReducers: (builder) => {
    // Fetch Announcements
    builder
      .addCase(fetchAnnouncements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnnouncements.fulfilled, (state, action) => {
        state.loading = false;
        state.announcements = action.payload.data;
        
        // Filter announcements for current user
        state.userAnnouncements = action.payload.data.filter(
          announcement => shouldShowToUser(announcement, 'current-user-role')
        );
        
        // Update unread count
        state.unreadCount = state.userAnnouncements.filter(
          a => !a.readBy.includes('current-user-id')
        ).length;
      })
      .addCase(fetchAnnouncements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch announcements';
      })
      
      // Create Announcement
      .addCase(createAnnouncement.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createAnnouncement.fulfilled, (state, action) => {
        state.creating = false;
        state.announcements.unshift(action.payload);
        
        // Add to user announcements if applicable
        if (shouldShowToUser(action.payload, 'current-user-role')) {
          state.userAnnouncements.unshift(action.payload);
          if (!action.payload.readBy.includes('current-user-id')) {
            state.unreadCount += 1;
          }
        }
      })
      .addCase(createAnnouncement.rejected, (state, action) => {
        state.creating = false;
        state.error = action.error.message || 'Failed to create announcement';
      })
      
      // Update Announcement
      .addCase(updateAnnouncement.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateAnnouncement.fulfilled, (state, action) => {
        state.updating = false;
        const updatedAnnouncement = action.payload;
        
        // Update in announcements array
        const index = state.announcements.findIndex(a => a.id === updatedAnnouncement.id);
        if (index !== -1) {
          state.announcements[index] = updatedAnnouncement;
        }
        
        // Update in user announcements
        const userIndex = state.userAnnouncements.findIndex(a => a.id === updatedAnnouncement.id);
        if (userIndex !== -1) {
          state.userAnnouncements[userIndex] = updatedAnnouncement;
        }
        
        // Update selected announcement
        if (state.selectedAnnouncement?.id === updatedAnnouncement.id) {
          state.selectedAnnouncement = updatedAnnouncement;
        }
      })
      .addCase(updateAnnouncement.rejected, (state, action) => {
        state.updating = false;
        state.error = action.error.message || 'Failed to update announcement';
      })
      
      // Delete Announcement
      .addCase(deleteAnnouncement.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteAnnouncement.fulfilled, (state, action) => {
        state.deleting = false;
        const id = action.payload;
        
        // Remove from both arrays
        state.announcements = state.announcements.filter(a => a.id !== id);
        const userAnnouncementIndex = state.userAnnouncements.findIndex(a => a.id === id);
        if (userAnnouncementIndex !== -1) {
          const announcement = state.userAnnouncements[userAnnouncementIndex];
          if (!announcement.readBy.includes('current-user-id')) {
            state.unreadCount -= 1;
          }
          state.userAnnouncements.splice(userAnnouncementIndex, 1);
        }
        
        // Clear selected if it's the deleted one
        if (state.selectedAnnouncement?.id === id) {
          state.selectedAnnouncement = null;
        }
      })
      .addCase(deleteAnnouncement.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.error.message || 'Failed to delete announcement';
      })
      
      // Mark as Read
      .addCase(markAnnouncementAsRead.fulfilled, (state, action) => {
        const { id, userId } = action.payload;
        
        // Update in both arrays
        [state.announcements, state.userAnnouncements].forEach(array => {
          const announcement = array.find(a => a.id === id);
          if (announcement && !announcement.readBy.includes(userId)) {
            announcement.readBy.push(userId);
            if (userId === 'current-user-id') {
              state.unreadCount -= 1;
            }
          }
        });
        
        // Update selected announcement
        if (state.selectedAnnouncement?.id === id && !state.selectedAnnouncement.readBy.includes(userId)) {
          state.selectedAnnouncement.readBy.push(userId);
        }
      });
  },
});

// Helper function to determine if announcement should be shown to user
function shouldShowToUser(announcement: Announcement, userRole: string): boolean {
  if (!announcement.published) return false;
  if (announcement.expiresAt && new Date(announcement.expiresAt) < new Date()) return false;
  if (announcement.scheduledFor && new Date(announcement.scheduledFor) > new Date()) return false;
  
  if (announcement.targetAudience === 'all') return true;
  
  // Map user roles to target audiences
  const roleMapping: Record<string, string[]> = {
    'admin': ['admins'],
    'developer': ['developers'],
    'designer': ['designers'],
    'manager': ['managers'],
  };
  
  const userAudiences = roleMapping[userRole] || [];
  return userAudiences.includes(announcement.targetAudience);
}

// Export actions and selectors
export const {
  setError,
  clearError,
  setActiveFilters,
  clearFilters,
  selectAnnouncement,
  announcementCreatedRealtime,
  announcementUpdatedRealtime,
  announcementDeletedRealtime,
  updateUnreadCount,
} = announcementSlice.actions;

// Selectors
export const selectAnnouncements = (state: { announcements: AnnouncementState }) => state.announcements.announcements;
export const selectUserAnnouncements = (state: { announcements: AnnouncementState }) => state.announcements.userAnnouncements;
export const selectAnnouncementsLoading = (state: { announcements: AnnouncementState }) => state.announcements.loading;
export const selectAnnouncementsError = (state: { announcements: AnnouncementState }) => state.announcements.error;
export const selectUnreadAnnouncementCount = (state: { announcements: AnnouncementState }) => state.announcements.unreadCount;
export const selectSelectedAnnouncement = (state: { announcements: AnnouncementState }) => state.announcements.selectedAnnouncement;
export const selectActiveAnnouncementFilters = (state: { announcements: AnnouncementState }) => state.announcements.activeFilters;

export default announcementSlice.reducer;