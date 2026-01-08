import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@queries/api-client';
import type { QueryRequest, ApiResponse, SubmissionType, DatabaseType } from '@/types';

interface SubmitRequestData {
    databaseType: DatabaseType;
    instanceId: string;
    databaseName: string;
    submissionType: SubmissionType;
    query?: string;
    script?: File;
    comments: string;
    podId: string;
}

export function useSubmitRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: SubmitRequestData) => {
            const formData = new FormData();
            formData.append('databaseType', data.databaseType);
            formData.append('instanceId', data.instanceId);
            formData.append('databaseName', data.databaseName);
            formData.append('submissionType', data.submissionType);
            formData.append('comments', data.comments);
            formData.append('podId', data.podId);

            if (data.query) {
                formData.append('query', data.query);
            }

            if (data.script) {
                formData.append('script', data.script);
            }

            const response = await apiClient.post<ApiResponse<QueryRequest>>(
                '/requests',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            return response.data.data!;
        },
        onSuccess: () => {
            // Invalidate my requests to show the new submission
            queryClient.invalidateQueries({ queryKey: ['my-requests'] });
        },
    });
}
