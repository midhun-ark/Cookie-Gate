import { useQuery } from '@tanstack/react-query';
import { languageApi } from '@/api';

export function useLanguages() {
    const { data: languages, isLoading, error } = useQuery({
        queryKey: ['languages'],
        queryFn: languageApi.list,
        staleTime: 1000 * 60 * 60, // Cache for 1 hour since languages rarely change
    });

    return {
        languages,
        isLoading,
        error
    };
}
