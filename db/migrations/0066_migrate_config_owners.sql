-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_configs_owner ON saved_configs(owner);
CREATE INDEX IF NOT EXISTS idx_profiles_owner ON profiles(owner);
CREATE INDEX IF NOT EXISTS idx_profiles_qualified_name ON profiles(qualified_name);

DO $$
DECLARE
    config_record RECORD;
    new_profile_id UUID;
    profile_qualified_name TEXT;
    batch_size INTEGER := 1000;
    processed_count INTEGER := 0;
    total_count INTEGER;
    cursor CURSOR FOR 
        SELECT DISTINCT sc.owner, 
               au.raw_user_meta_data->>'user_name' as raw_username,
               LOWER(au.raw_user_meta_data->>'user_name') as username
        FROM saved_configs sc
        JOIN auth.users au ON sc.owner = au.id
        WHERE NOT EXISTS (
            SELECT 1 FROM profiles p WHERE p.owner = sc.owner
        );
BEGIN
    -- Get total count for progress tracking
    SELECT COUNT(*) INTO total_count FROM (
        SELECT DISTINCT sc.owner
        FROM saved_configs sc
        WHERE NOT EXISTS (
            SELECT 1 FROM profiles p WHERE p.owner = sc.owner
        )
    ) as distinct_owners;

    RAISE NOTICE 'Starting migration. Total records to process: %', total_count;

    OPEN cursor;
    LOOP
        FETCH cursor INTO config_record;
        EXIT WHEN NOT FOUND;

        -- Debug log the values we're getting
        RAISE NOTICE 'Processing owner: %, raw_username: %, username: %', 
            config_record.owner, config_record.raw_username, config_record.username;

        -- Generate qualified name
        profile_qualified_name := config_record.username || '-default';

        -- Check for name conflicts and throw error if exists
        IF EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.qualified_name = profile_qualified_name
        ) THEN
            RAISE EXCEPTION 'Qualified name % already exists', profile_qualified_name;
        END IF;

        -- Create new profile with all required fields
        INSERT INTO profiles (
            owner, 
            qualified_name, 
            display_name,
            description,
            created_at, 
            updated_at
        ) VALUES (
            config_record.owner, 
            profile_qualified_name,
            'Default Profile',
            'My saved configurations',
            NOW(), 
            NOW()
        ) RETURNING id INTO new_profile_id;

        -- Update all saved_configs for this owner with the new profile_id
        UPDATE saved_configs 
        SET profile_id = new_profile_id,
            updated_at = NOW()
        WHERE owner = config_record.owner;

        RAISE NOTICE 'Created new profile % for owner % with qualified_name %', 
            new_profile_id, config_record.owner, profile_qualified_name;

        processed_count := processed_count + 1;
        IF processed_count % batch_size = 0 THEN
            RAISE NOTICE 'Processed % out of % records', processed_count, total_count;
        END IF;
    END LOOP;
    CLOSE cursor;

    RAISE NOTICE 'Migration completed. Processed % records', processed_count;

    -- Verification 1: Check for any saved configs without profile_id
    IF EXISTS (
        SELECT 1 FROM saved_configs 
        WHERE profile_id IS NULL AND owner IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Some configs were not migrated - missing profile_id';
    END IF;

    -- Verification 2: Check for duplicate qualified names
    IF EXISTS (
        SELECT qualified_name, COUNT(*)
        FROM profiles
        GROUP BY qualified_name
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate qualified names found in profiles';
    END IF;

    -- Verification 3: Check for profiles with missing required fields
    IF EXISTS (
        SELECT 1 FROM profiles
        WHERE qualified_name IS NULL 
           OR display_name IS NULL 
           OR owner IS NULL
    ) THEN
        RAISE EXCEPTION 'Some profiles have missing required fields';
    END IF;

    -- Verification 4: Check that each owner has exactly one default profile
    IF EXISTS (
        SELECT owner, COUNT(*)
        FROM profiles
        GROUP BY owner
        HAVING COUNT(*) != 1
    ) THEN
        RAISE EXCEPTION 'Some owners have incorrect number of profiles';
    END IF;

    -- Verification 5: Check that all saved configs are linked to valid profiles
    IF EXISTS (
        SELECT 1 FROM saved_configs sc
        WHERE sc.profile_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = sc.profile_id
        )
    ) THEN
        RAISE EXCEPTION 'Some configs are linked to non-existent profiles';
    END IF;

    -- Verification 6: Check that profile owners match config owners
    IF EXISTS (
        SELECT 1 FROM saved_configs sc
        JOIN profiles p ON sc.profile_id = p.id
        WHERE sc.owner != p.owner
    ) THEN
        RAISE EXCEPTION 'Some configs are linked to profiles with different owners';
    END IF;

    RAISE NOTICE 'All verifications passed successfully';
END $$; 