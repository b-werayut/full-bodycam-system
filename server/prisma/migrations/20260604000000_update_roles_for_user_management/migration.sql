SET IDENTITY_INSERT [dbo].[Roles] ON;

MERGE [dbo].[Roles] AS target
USING (VALUES
    (1, 'SuperAdmin', 4),
    (2, 'Admin', 3),
    (3, 'Supervisor', 3),
    (4, 'Officer', 3),
    (5, 'Viewer', 1)
) AS source ([RoleId], [RoleName], [SecurityLevel])
ON target.[RoleId] = source.[RoleId]
WHEN MATCHED THEN
    UPDATE SET
        [RoleName] = source.[RoleName],
        [SecurityLevel] = source.[SecurityLevel]
WHEN NOT MATCHED BY TARGET THEN
    INSERT ([RoleId], [RoleName], [SecurityLevel])
    VALUES (source.[RoleId], source.[RoleName], source.[SecurityLevel]);

SET IDENTITY_INSERT [dbo].[Roles] OFF;
