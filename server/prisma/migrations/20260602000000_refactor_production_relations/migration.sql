BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[Devices] (
    [DeviceCode] NVARCHAR(50) NOT NULL,
    [DeviceType] VARCHAR(255),
    [SerialNo] VARCHAR(255),
    [UserId] INT NOT NULL,
    [Status] BIT NOT NULL CONSTRAINT [Devices_Status_df] DEFAULT 0,
    [RegisteredAt] DATETIME NOT NULL CONSTRAINT [Devices_RegisteredAt_df] DEFAULT CURRENT_TIMESTAMP,
    [Active] BIT NOT NULL CONSTRAINT [Devices_Active_df] DEFAULT 1,
    [DeviceName] NVARCHAR(255),
    [ActiveUpdatedAt] DATETIME,
    [StatusUpdatedAt] DATETIME,
    CONSTRAINT [Devices_pkey] PRIMARY KEY CLUSTERED ([DeviceCode])
);

-- CreateTable
CREATE TABLE [dbo].[LoginLogs] (
    [LogId] INT NOT NULL IDENTITY(1,1),
    [UserId] INT,
    [Username] VARCHAR(255) NOT NULL,
    [IsSuccess] BIT NOT NULL,
    [FailureReason] VARCHAR(max),
    [DeviceId] NVARCHAR(50),
    [LoggedAt] DATETIME NOT NULL CONSTRAINT [LoginLogs_LoggedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [LoginLogs_pkey] PRIMARY KEY CLUSTERED ([LogId])
);

-- CreateTable
CREATE TABLE [dbo].[LoginSession] (
    [SessionId] INT NOT NULL IDENTITY(1,1),
    [UserId] INT NOT NULL,
    [RefreshTokenHash] NVARCHAR(255) NOT NULL,
    [DeviceId] NVARCHAR(100) NOT NULL,
    [ExpiresAt] DATETIME2 NOT NULL,
    [CreatedAt] DATETIME NOT NULL CONSTRAINT [LoginSession_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [LastUsedAt] DATETIME NOT NULL CONSTRAINT [LoginSession_LastUsedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [LoginSession_pkey] PRIMARY KEY CLUSTERED ([SessionId])
);

-- CreateTable
CREATE TABLE [dbo].[Missions] (
    [MissionId] INT NOT NULL IDENTITY(1,1),
    [ReportId] NVARCHAR(100) NOT NULL,
    [MissionName] NVARCHAR(400),
    [StartTime] DATETIME,
    [EndTime] DATETIME,
    [Description] NVARCHAR(max),
    [OfficerId] INT,
    [LocationId] INT,
    [MissionStatus] NVARCHAR(50) NOT NULL CONSTRAINT [Missions_MissionStatus_df] DEFAULT '1',
    [DeviceCode] NVARCHAR(50),
    [CreatedAt] DATETIME NOT NULL CONSTRAINT [Missions_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [Duration] INT,
    [Latitude] DECIMAL(9,6),
    [Longitude] DECIMAL(9,6),
    [Note] NVARCHAR(500),
    [Priority] NVARCHAR(50),
    CONSTRAINT [Missions_pkey] PRIMARY KEY CLUSTERED ([MissionId]),
    CONSTRAINT [Missions_ReportId_key] UNIQUE NONCLUSTERED ([ReportId])
);

-- CreateTable
CREATE TABLE [dbo].[Officers] (
    [OfficerId] INT NOT NULL IDENTITY(1,1),
    [OfficerName] NVARCHAR(200),
    [CreatedAt] DATETIME NOT NULL CONSTRAINT [Officers_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Officers_pkey] PRIMARY KEY CLUSTERED ([OfficerId])
);

-- CreateTable
CREATE TABLE [dbo].[Roles] (
    [RoleId] INT NOT NULL IDENTITY(1,1),
    [RoleName] VARCHAR(255) NOT NULL,
    [SecurityLevel] INT NOT NULL,
    CONSTRAINT [Roles_pkey] PRIMARY KEY CLUSTERED ([RoleId])
);

-- SeedData
SET IDENTITY_INSERT [dbo].[Roles] ON;
INSERT INTO [dbo].[Roles] ([RoleId], [RoleName], [SecurityLevel]) VALUES
    (1, 'SuperAdmin', 4),
    (2, 'Admin', 3),
    (3, 'Supervisor', 3),
    (4, 'Officer', 3),
    (5, 'Viewer', 1);
SET IDENTITY_INSERT [dbo].[Roles] OFF;

-- CreateTable
CREATE TABLE [dbo].[Users] (
    [UserId] INT NOT NULL IDENTITY(1,1),
    [Username] VARCHAR(255) NOT NULL,
    [PasswordHash] VARCHAR(255) NOT NULL,
    [RoleId] INT,
    [Active] BIT NOT NULL CONSTRAINT [Users_Active_df] DEFAULT 1,
    [CreatedAt] DATETIME NOT NULL CONSTRAINT [Users_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedAt] DATETIME NOT NULL CONSTRAINT [Users_UpdatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Users_pkey] PRIMARY KEY CLUSTERED ([UserId]),
    CONSTRAINT [Users_Username_key] UNIQUE NONCLUSTERED ([Username])
);

-- CreateTable
CREATE TABLE [dbo].[Location] (
    [LocationId] INT NOT NULL IDENTITY(1,1),
    [LocationCode] NVARCHAR(50) NOT NULL,
    [DeviceCode] NVARCHAR(50) NOT NULL,
    [Latitude] DECIMAL(9,6),
    [Longitude] DECIMAL(9,6),
    [LocationName] NVARCHAR(255),
    [RecordedAt] DATETIME NOT NULL CONSTRAINT [Location_RecordedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Location_pkey] PRIMARY KEY CLUSTERED ([LocationId]),
    CONSTRAINT [Location_LocationCode_key] UNIQUE NONCLUSTERED ([LocationCode])
);

-- CreateTable
CREATE TABLE [dbo].[EventLog] (
    [LogId] INT NOT NULL IDENTITY(1,1),
    [TypeKey] NVARCHAR(50) NOT NULL,
    [OfficerName] NVARCHAR(255) NOT NULL,
    [EventTime] DATETIME NOT NULL CONSTRAINT [EventLog_EventTime_df] DEFAULT CURRENT_TIMESTAMP,
    [Severity] NVARCHAR(20) NOT NULL,
    [LocationName] NVARCHAR(255),
    [Details] NVARCHAR(max),
    [IsRead] BIT NOT NULL CONSTRAINT [EventLog_IsRead_df] DEFAULT 0,
    [DeviceCode] NVARCHAR(50),
    [MissionId] INT,
    CONSTRAINT [EventLog_pkey] PRIMARY KEY CLUSTERED ([LogId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Devices_UserId_idx] ON [dbo].[Devices]([UserId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Devices_Active_Status_idx] ON [dbo].[Devices]([Active], [Status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LoginLogs_UserId_idx] ON [dbo].[LoginLogs]([UserId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LoginSession_UserId_idx] ON [dbo].[LoginSession]([UserId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Missions_DeviceCode_idx] ON [dbo].[Missions]([DeviceCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Missions_LocationId_idx] ON [dbo].[Missions]([LocationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Missions_OfficerId_idx] ON [dbo].[Missions]([OfficerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Missions_MissionStatus_idx] ON [dbo].[Missions]([MissionStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Missions_CreatedAt_MissionId_idx] ON [dbo].[Missions]([CreatedAt], [MissionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Missions_DeviceCode_MissionStatus_CreatedAt_idx] ON [dbo].[Missions]([DeviceCode], [MissionStatus], [CreatedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Users_RoleId_idx] ON [dbo].[Users]([RoleId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Location_DeviceCode_idx] ON [dbo].[Location]([DeviceCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Location_RecordedAt_idx] ON [dbo].[Location]([RecordedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Location_DeviceCode_RecordedAt_idx] ON [dbo].[Location]([DeviceCode], [RecordedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EventLog_DeviceCode_idx] ON [dbo].[EventLog]([DeviceCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EventLog_MissionId_idx] ON [dbo].[EventLog]([MissionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EventLog_EventTime_idx] ON [dbo].[EventLog]([EventTime]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EventLog_IsRead_EventTime_idx] ON [dbo].[EventLog]([IsRead], [EventTime]);

-- AddForeignKey
ALTER TABLE [dbo].[Devices] ADD CONSTRAINT [Devices_UserId_fkey] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LoginLogs] ADD CONSTRAINT [LoginLogs_UserId_fkey] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LoginSession] ADD CONSTRAINT [LoginSession_UserId_fkey] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Missions] ADD CONSTRAINT [Missions_DeviceCode_fkey] FOREIGN KEY ([DeviceCode]) REFERENCES [dbo].[Devices]([DeviceCode]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Missions] ADD CONSTRAINT [Missions_LocationId_fkey] FOREIGN KEY ([LocationId]) REFERENCES [dbo].[Location]([LocationId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Missions] ADD CONSTRAINT [Missions_OfficerId_fkey] FOREIGN KEY ([OfficerId]) REFERENCES [dbo].[Officers]([OfficerId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Users] ADD CONSTRAINT [Users_RoleId_fkey] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[Roles]([RoleId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Location] ADD CONSTRAINT [Location_DeviceCode_fkey] FOREIGN KEY ([DeviceCode]) REFERENCES [dbo].[Devices]([DeviceCode]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[EventLog] ADD CONSTRAINT [EventLog_DeviceCode_fkey] FOREIGN KEY ([DeviceCode]) REFERENCES [dbo].[Devices]([DeviceCode]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[EventLog] ADD CONSTRAINT [EventLog_MissionId_fkey] FOREIGN KEY ([MissionId]) REFERENCES [dbo].[Missions]([MissionId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
