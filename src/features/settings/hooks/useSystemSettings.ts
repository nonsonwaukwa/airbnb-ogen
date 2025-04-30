import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabaseClient';
import type { SystemSettings, UpdateSystemSettingsPayload } from '../types';
import { toast } from 'sonner';

const SETTINGS_QUERY_KEY = 'systemSettings';
// Assume a single row strategy with a known ID for settings
const SETTINGS_ROW_ID = 1; 

// == Query Function ==
const getSystemSettings = async (): Promise<SystemSettings | null> => {
    const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', SETTINGS_ROW_ID) // Fetch the specific row
        .maybeSingle(); // Use maybeSingle to return null if not found, instead of error

    if (error) {
        console.error('Error fetching system settings:', error);
        throw new Error(error.message);
    }
    return data;
};

// == Mutation Function ==
const updateSystemSettings = async (payload: UpdateSystemSettingsPayload): Promise<SystemSettings> => {
    
    // Prepare the data for upsert, including the ID
    const upsertData = { 
        ...payload, 
        id: SETTINGS_ROW_ID // Ensure the ID is included for upsert
    };

    const { data: updatedSettings, error } = await supabase
        .from('system_settings')
        // Use upsert instead of update
        .upsert(upsertData, { 
            onConflict: 'id' // Specify the conflict target (the primary key)
         })
        .select()
        .single(); // .single() should now work as upsert guarantees one row affected/returned

    if (error) {
        console.error('Error upserting system settings:', error);
        // Provide a more specific error message if possible
        let userMessage = `Failed to save settings: ${error.message}`;
        if (error.message.includes('violates row-level security policy')) {
            userMessage = 'Failed to save settings: Permission denied.';
        } // Add more specific checks if needed
        throw new Error(userMessage);
    }
     if (!updatedSettings) {
        // This case should be less likely with upsert but handle defensively
        throw new Error('Failed to save settings, no data returned after operation.');
    }
    return updatedSettings;
};

// == React Query Hooks ==

export const useGetSystemSettings = () => {
    return useQuery<SystemSettings | null, Error>({
        queryKey: [SETTINGS_QUERY_KEY],
        queryFn: getSystemSettings,
        staleTime: 1000 * 60 * 5, // Cache settings for 5 minutes
    });
};

export const useUpdateSystemSettings = () => {
    const queryClient = useQueryClient();

    return useMutation<SystemSettings, Error, UpdateSystemSettingsPayload>({
        mutationFn: updateSystemSettings,
        onSuccess: (data) => {
            toast.success('System settings updated successfully.');
            // Update the cache directly
            queryClient.setQueryData([SETTINGS_QUERY_KEY], data);
            // Optionally invalidate if other queries depend on settings, though direct update is often sufficient
            // queryClient.invalidateQueries({ queryKey: [SETTINGS_QUERY_KEY] });
        },
        onError: (error) => {
            toast.error(`Failed to update settings: ${error.message}`);
        },
    });
}; 
 
 
 
 
 
 