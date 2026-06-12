BEGIN TRY

BEGIN TRAN;

WITH LatestLocation AS (
    SELECT
        [LocationCode],
        [DeviceCode],
        ROW_NUMBER() OVER (
            PARTITION BY [DeviceCode]
            ORDER BY [RecordedAt] DESC, [LocationId] DESC
        ) AS [rn]
    FROM [dbo].[Location]
)
UPDATE [m]
SET [m].[LocationCode] = [l].[LocationCode]
FROM [dbo].[Missions] AS [m]
INNER JOIN [LatestLocation] AS [l]
    ON [l].[DeviceCode] = [m].[DeviceCode]
    AND [l].[rn] = 1
WHERE [m].[LocationCode] IS NULL
  AND [m].[DeviceCode] IS NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
