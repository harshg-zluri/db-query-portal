import { Select, type SelectOption } from '@components/select';
import { useInstances, useDatabases } from '../../queries/use-databases';
import { DatabaseType } from '@/types';

interface DatabaseSelectorProps {
    databaseType: DatabaseType | '';
    instanceId: string;
    databaseName: string;
    onDatabaseTypeChange: (type: DatabaseType) => void;
    onInstanceChange: (instanceId: string) => void;
    onDatabaseChange: (databaseName: string) => void;
    errors?: {
        databaseType?: string;
        instanceId?: string;
        databaseName?: string;
    };
}

export function DatabaseSelector({
    databaseType,
    instanceId,
    databaseName,
    onDatabaseTypeChange,
    onInstanceChange,
    onDatabaseChange,
    errors,
}: DatabaseSelectorProps) {
    const { data: instances, isLoading: instancesLoading } = useInstances(
        databaseType || undefined
    );
    const { data: databases, isLoading: databasesLoading } = useDatabases(instanceId);

    const databaseTypeOptions: SelectOption[] = [
        { value: DatabaseType.POSTGRESQL, label: 'PostgreSQL' },
        { value: DatabaseType.MONGODB, label: 'MongoDB' },
    ];

    const instanceOptions: SelectOption[] = instancesLoading ? [] : (instances || []).map((inst) => ({
        value: inst.id,
        label: `${inst.name} (${inst.type})`,
    }));

    // Ensure databases is always an array of strings
    const databaseOptions: SelectOption[] = databasesLoading ? [] : (databases || []).map((db) => ({
        value: typeof db === 'string' ? db : String(db),
        label: typeof db === 'string' ? db : String(db),
    }));

    const handleDatabaseTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value as DatabaseType;
        onDatabaseTypeChange(newType);
        // Reset dependent fields
        onInstanceChange('');
        onDatabaseChange('');
    };

    const handleInstanceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onInstanceChange(e.target.value);
        // Reset database
        onDatabaseChange('');
    };

    return (
        <div className="space-y-4">
            <Select
                label="Database Type"
                placeholder="Select database type"
                options={databaseTypeOptions}
                value={databaseType}
                onChange={handleDatabaseTypeChange}
                error={errors?.databaseType}
                required
            />

            <Select
                label="Instance Name"
                placeholder="Select instance"
                options={instanceOptions}
                value={instanceId}
                onChange={handleInstanceChange}
                isLoading={instancesLoading}
                disabled={!databaseType}
                error={errors?.instanceId}
                required
            />

            <Select
                label="Database Name"
                placeholder="Select database"
                options={databaseOptions}
                value={databaseName}
                onChange={(e) => onDatabaseChange(e.target.value)}
                isLoading={databasesLoading}
                disabled={!instanceId}
                error={errors?.databaseName}
                required
            />
        </div>
    );
}
