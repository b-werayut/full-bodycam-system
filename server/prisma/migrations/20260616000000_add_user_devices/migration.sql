BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[UserDevices] (
    [DeviceTokenId] INT NOT NULL IDENTITY(1,1),
    [UserId] INT NOT NULL,
    [DeviceId] NVARCHAR(100) NOT NULL,
    [FirebaseToken] NVARCHAR(450) NOT NULL,
    [Platform] NVARCHAR(20) NOT NULL CONSTRAINT [UserDevices_Platform_df] DEFAULT 'mobile',
    [IsActive] BIT NOT NULL CONSTRAINT [UserDevices_IsActive_df] DEFAULT 1,
    [CreatedAt] DATETIME NOT NULL CONSTRAINT [UserDevices_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedAt] DATETIME NOT NULL CONSTRAINT [UserDevices_UpdatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [LastSeenAt] DATETIME NOT NULL CONSTRAINT [UserDevices_LastSeenAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserDevices_pkey] PRIMARY KEY CLUSTERED ([DeviceTokenId]),
    CONSTRAINT [UserDevices_UserId_DeviceId_key] UNIQUE NONCLUSTERED ([UserId], [DeviceId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [UserDevices_UserId_idx] ON [dbo].[UserDevices]([UserId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [UserDevices_IsActive_idx] ON [dbo].[UserDevices]([IsActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [UserDevices_FirebaseToken_idx] ON [dbo].[UserDevices]([FirebaseToken]);

-- AddForeignKey
ALTER TABLE [dbo].[UserDevices] ADD CONSTRAINT [UserDevices_UserId_fkey] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
