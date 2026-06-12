BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Missions] DROP CONSTRAINT [Missions_LocationId_fkey];

-- DropIndex
DROP INDEX [Missions_LocationId_idx] ON [dbo].[Missions];

-- AddColumn
ALTER TABLE [dbo].[Missions] ADD [LocationCode] NVARCHAR(50);

-- BackfillData
UPDATE [m]
SET [m].[LocationCode] = [l].[LocationCode]
FROM [dbo].[Missions] AS [m]
INNER JOIN [dbo].[Location] AS [l] ON [m].[LocationId] = [l].[LocationId]
WHERE [m].[LocationId] IS NOT NULL;

-- DropColumn
ALTER TABLE [dbo].[Missions] DROP COLUMN [LocationId];

-- CreateIndex
CREATE NONCLUSTERED INDEX [Missions_LocationCode_idx] ON [dbo].[Missions]([LocationCode]);

-- AddForeignKey
ALTER TABLE [dbo].[Missions] ADD CONSTRAINT [Missions_LocationCode_fkey] FOREIGN KEY ([LocationCode]) REFERENCES [dbo].[Location]([LocationCode]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
