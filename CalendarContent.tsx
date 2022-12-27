import {
    FitRelative,
    LoadingArea,
    palette,
    ScrollableContent,
    spacing,
} from '@advifactory/ifp-ui-core';
import { createStyles, makeStyles, Paper, Theme, Link } from '@material-ui/core';
import clsx from 'clsx';
import { images, EStatusColor } from 'common';
import { ETaskCategory, ETaskCheckItemStatus, ETaskStatus, Maybe } from 'graphqlApi';
import { DateTime } from 'luxon';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useLocation, withRouter, Link as RouterLink } from 'react-router-dom';
import { EMobileCalendarType } from 'views/Mobile/SharePages/AdvMobileCalendarHeader';
import { routePaths } from 'views/MobileOEEM';
import { getReviewerProgress } from 'views/Portal/TaskManagement/AllScheduled/CalendarDetailPage';
import { vhToPixels } from '../InboxPage/InboxContent';

function createColorStyles({ backgroundColor }: { backgroundColor?: string }) {
    return createStyles({
        '& $taskRecordStatusIcon': {
            backgroundColor: backgroundColor,
        },
    });
}

const useStyles = makeStyles(
    (theme: Theme) =>
        createStyles({
            [EStatusColor.Red]: {
                ...createColorStyles({
                    backgroundColor: palette.redBase,
                }),
            },
            [EStatusColor.Yellow]: {
                ...createColorStyles({
                    backgroundColor: palette.yellowBase,
                }),
            },
            [EStatusColor.Green]: {
                ...createColorStyles({
                    backgroundColor: palette.greenBase,
                }),
            },
            [EStatusColor.Blue]: {
                ...createColorStyles({
                    backgroundColor: palette.blueBase,
                }),
            },
            [EStatusColor.Orange]: {
                ...createColorStyles({
                    backgroundColor: palette.orangeBase,
                }),
            },
            [EStatusColor.Gray]: {
                ...createColorStyles({
                    backgroundColor: palette.grayBase,
                }),
            },
            [EStatusColor.Cyan]: {
                ...createColorStyles({
                    backgroundColor: palette.cyanBase,
                }),
            },
            bodyContainerDay: {
                flexGrow: 1,
                flexShrink: 0,
                position: 'relative',
                height: `calc(100vh - 190px)`,
            },
            bodyContainerWeek: {
                flexGrow: 1,
                flexShrink: 0,
                position: 'relative',
                height: `calc(100vh - 240px)`,
            },
            bodyContainerMonth: {
                flexGrow: 1,
                flexShrink: 0,
                position: 'relative',
                height: `calc(100vh - 483px)`,
            },
            card: {
                padding: spacing.spacingS,
                margin: spacing.spacingS,
                flexGrow: 1,
                marginLeft: 0,
            },
            paddingMarginSm: {
                padding: spacing.spacingS,
                margin: spacing.spacingS,
            },
            boldGrayDarker: {
                fontWeight: 'bold',
                color: palette.grayDarker,
            },
            smallFont12: {
                fontSize: '12px',
            },
            overdueIcon: {
                borderRadius: '4px',
                padding: '0 4px',
                color: palette.white,
                backgroundColor: palette.redBase,
                marginLeft: '4px',
                fontWeight: 'bold',
                fontSize: '12px',
                marginRight: spacing.spacingS,
            },
            overdueText: {
                color: palette.redBase,
            },
            marginTopBottomXs: {
                marginBottom: spacing.spacingXs,
                marginTop: spacing.spacingXs,
            },
            machineInformation: {
                marginRight: spacing.spacingS,
                marginTop: spacing.spacingS,
                display: 'flex',
            },
            machineImage: {
                maxWidth: '48px',
                maxHeight: '48px',
                width: 'auto',
                height: 'auto',
                marginRight: spacing.spacingS,
                display: 'block',
            },
            machineDefaultImage: {
                width: '48px',
                height: '48px',
                backgroundColor: palette.grayLighter,
            },
            machineName: {
                fontSize: '16px',
                fontWeight: 'bold',
                color: palette.black,
            },
            cardContentPadding: {
                padding: '0',
            },
            grayDarker: {
                color: palette.grayDarker,
            },
            borderLeftRepair: {
                borderLeft: `3px solid ${palette.cyanBase}`,
            },
            borderLeftMaintenance: {
                borderLeft: `3px solid ${palette.purpleBase}`,
            },
            hrDivider: {
                height: '1px',
                border: 'none',
                backgroundColor: palette.grayBase,
            },
            justifyFlexEnd: {
                display: 'flex',
                justifyContent: 'flex-end',
            },
            actionButtons: {
                padding: spacing.spacingS,
                margin: spacing.spacingXs,
                minWidth: '100px',
                width: 'auto',
            },
            taskRecordStatusIcon: {
                borderRadius: '4px',
                padding: '0 4px',
                color: palette.white,
                marginLeft: '4px',
                fontWeight: 'bold',
                fontSize: '12px',
                marginRight: spacing.spacingS,
            },
            flexAlignCenter: {
                display: 'flex',
            },
            paddingRightSm: {
                paddingRight: spacing.spacingS,
            },
        }),
    { name: 'CalendarContent' },
);

const CalendarContent = (props: any) => {
    const classes = useStyles();

    const {
        taskRecords: taskRecordsProp,
        doing,
        page,
        setPage,
        currentDateType,
        // mobileSummaryRefetch,
        // taskRecordsRefetch,
        taskRecordsPagingInfo,
    } = props;

    const [taskRecords, setTaskRecords] = useState<any[]>([]);
    const { t, i18n } = useTranslation();
    let IFPLang = i18n.language;
    let queryParam = useQuery();
    let qpDateType = queryParam.get('dateType') ?? EMobileCalendarType.Week;
    const { search } = useLocation();

    function useQuery() {
        return new URLSearchParams(search);
    }

    // Check to see if task record is overdue
    const getIsOverdue = useCallback((endDate: Maybe<string | undefined>, status: ETaskStatus) => {
        const timeNow = new Date().getTime();

        if (status === ETaskStatus.Completed || status === ETaskStatus.Cancelled) return false;

        return timeNow > new Date(endDate ?? timeNow).getTime();
    }, []);

    const getIsRejected = (checkItems: any[]) => {
        return checkItems.filter(
            (checkItem) => checkItem.status === ETaskCheckItemStatus.Reassigned,
        ).length;
    };

    const getIsFailed = (checkItems: any[]) => {
        return checkItems.filter((checkItem) => checkItem.status === ETaskCheckItemStatus.Fail)
            .length;
    };

    const taskRecordsGroupByDate = useMemo(() => {
        if (!taskRecords?.length) return;

        const taskRecordsWithAssignedDate = taskRecords?.map((taskRecord: any) => {
            const start = DateTime.fromISO(
                taskRecord?.dateRange?.startDate ?? new Date().toISOString(),
            );
            const end = DateTime.fromISO(
                taskRecord?.dateRange?.endDate ?? new Date().toISOString(),
            );

            const isAllDay = (end.diff(start, 'days').toObject().days ?? 0) >= 1;

            const assignedDate = DateTime.fromISO(taskRecord.createdAt)
                .startOf('day')
                .toJSDate()
                .getTime();
            return { ...taskRecord, assignedDate, isAllDay };
        });

        function groupBy(list: any, keyGetter: any) {
            const map = new Map();
            list.forEach((item: any) => {
                const key = keyGetter(item);
                const collection = map.get(key);
                if (!collection) {
                    map.set(key, [item]);
                } else {
                    collection.push(item);
                }
            });
            return map;
        }
        const taskRecordsGroupByDateMap = groupBy(
            taskRecordsWithAssignedDate,
            (taskRecord: any) => taskRecord.assignedDate,
        );
        const taskRecordsGroupByDate = Array.from(taskRecordsGroupByDateMap).map(
            ([key, value]) => ({ key, value }),
        );

        return taskRecordsGroupByDate;
    }, [taskRecords]);

    const hasIsAllDayEvent = taskRecordsGroupByDate?.find((taskRecord: any) =>
        taskRecord?.value?.some((x: any) => x.isAllDay),
    );

    const hasIsNotAllDayEvent = taskRecordsGroupByDate?.find((taskRecord: any) =>
        taskRecord?.value?.some((x: any) => !x.isAllDay),
    );

    const renderEvents = (source: any[], isAllDay: boolean) => {
        return source
            .sort(
                (a: any, b: any) =>
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            )
            .map((taskRecord: any, index: number) => {
                const machineImageUrl = taskRecord.machine.imageUrl;
                const machineName = taskRecord.machine.name;
                const status = taskRecord.status;
                const location = taskRecord.machine.location
                    .slice()
                    .reverse()
                    .map((location: any) => location.name)
                    .join(' / ');
                const dueDate = DateTime.fromISO(taskRecord.dateRange.endDate)
                    .setLocale(IFPLang ?? 'en-US')
                    .toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS);
                const notCancelledOrCompleted =
                    taskRecord?.status !== ETaskStatus.Cancelled &&
                    taskRecord?.status !== ETaskStatus.Completed;
                const isOverdue =
                    getIsOverdue(taskRecord.dateRange?.endDate, taskRecord.status) &&
                    notCancelledOrCompleted;
                const isRejectedCount = getIsRejected(taskRecord?.checkItems);
                const isRejected = isRejectedCount > 0 && notCancelledOrCompleted;
                const isFailedCount = getIsFailed(taskRecord?.checkItems);
                const isFailed = isFailedCount > 0 && notCancelledOrCompleted;
                const color =
                    taskRecord.status === ETaskStatus.Assigned
                        ? EStatusColor.Yellow
                        : taskRecord.status === ETaskStatus.Completed
                        ? EStatusColor.Green
                        : taskRecord.status === ETaskStatus.InReview
                        ? EStatusColor.Blue
                        : taskRecord.status === ETaskStatus.Cancelled
                        ? EStatusColor.Gray
                        : EStatusColor.Orange;

                return (
                    // <Link
                    //     component={RouterLink}
                    //     to={routePaths.detailsByTaskRecordId(taskRecord?.id, search)}
                    //     key={taskRecord?.id}
                    // >
                    <div style={{ display: 'flex' }} key={taskRecord?.id}>
                        {isAllDay ? (
                            <div
                                style={{
                                    padding: '24px 4px',
                                    borderRight: `solid 1px ${palette.grayBase}`,
                                    width: '44px',
                                }}
                            >
                                <div
                                    style={{
                                        padding: '24px 4px',
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            color: '#323233',
                                        }}
                                    >
                                        {index === 0 && t('mi-maintenance.all-day')}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                style={{
                                    padding: '24px 6px 0px 6px',
                                    borderRight: `solid 1px ${palette.grayBase}`,
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        float: 'right',
                                        color: '#323233',
                                    }}
                                >
                                    {DateTime.fromISO(taskRecord.dateRange.startDate).toFormat(
                                        'hh:mm',
                                    )}
                                </div>
                                <div>
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            float: 'right',
                                            color: '#c8c8c8',
                                        }}
                                    >
                                        {DateTime.fromISO(taskRecord.dateRange.endDate).toFormat(
                                            'hh:mm',
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        <Paper
                            id={taskRecord.taskNo}
                            variant="outlined"
                            className={clsx(
                                classes.card,
                                {
                                    [classes.borderLeftMaintenance]:
                                        taskRecord?.category !== ETaskCategory.Repair,
                                },
                                {
                                    [classes.borderLeftRepair]:
                                        taskRecord?.category === ETaskCategory.Repair,
                                },
                                classes[color as EStatusColor],
                            )}
                            key={taskRecord.taskNo}
                        >
                            <Link
                                style={{ textDecoration: 'none' }}
                                component={RouterLink}
                                to={routePaths.detailsByTaskRecordId(taskRecord?.id ?? '', search)}
                            >
                                {isOverdue ? (
                                    <span className={classes.overdueIcon}>
                                        {t('mi-maintenance.overdue')}
                                    </span>
                                ) : isFailed ? (
                                    <span className={classes.overdueIcon}>
                                        {t('mi-maintenance.failed') + ` (${isFailedCount})`}
                                    </span>
                                ) : isRejected ? (
                                    <span className={classes.overdueIcon}>
                                        {t('mi-maintenance.rejected') + ` (${isRejectedCount})`}
                                    </span>
                                ) : (
                                    <span className={clsx(classes.taskRecordStatusIcon)}>
                                        {t(`mi-maintenance.${status?.replace(/\s+/g, '')}`) +
                                            getReviewerProgress(taskRecord)}
                                    </span>
                                )}
                                <span className={clsx(classes.boldGrayDarker, classes.smallFont12)}>
                                    #{taskRecord.taskNo}
                                </span>
                                <div className={classes.machineInformation}>
                                    <img
                                        className={clsx(classes.machineImage, {
                                            [classes.machineDefaultImage]: !!!machineImageUrl,
                                        })}
                                        src={machineImageUrl || images.ImgMainImage}
                                        alt={
                                            machineImageUrl ? machineName : 'machine default photo'
                                        }
                                    />
                                    <div>
                                        <div className={classes.machineName}>{machineName}</div>
                                        <div
                                            className={clsx(
                                                classes.smallFont12,
                                                classes.grayDarker,
                                                classes.flexAlignCenter,
                                            )}
                                        >
                                            <span className={classes.paddingRightSm}>
                                                <images.ImgMobileMainGroupMGrayDark />
                                            </span>
                                            {location}
                                        </div>
                                        <div
                                            className={clsx(
                                                classes.smallFont12,
                                                classes.grayDarker,
                                                classes.flexAlignCenter,
                                            )}
                                        >
                                            <span className={classes.paddingRightSm}>
                                                <images.ImgMobileMainCalendarMGrayDark />
                                            </span>
                                            {t('mi-maintenance.Due')}: {dueDate}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </Paper>
                    </div>
                    // </Link>
                );
            });
    };

    useEffect(() => {
        if (page > 0) {
            setTaskRecords((prevState: any) => prevState.concat(taskRecordsProp));
        } else if (page === 0) {
            setTaskRecords(taskRecordsProp);
        } else {
            return;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskRecordsProp, setTaskRecords]);

    useEffect(() => {
        if (page === 0 || !taskRecordsProp?.[0]) return;
        const scrollTo = document.getElementById(taskRecordsProp[0].taskNo);
        scrollTo?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, taskRecords]);

    return doing ? (
        <LoadingArea />
    ) : (
        <InfiniteScroll
            dataLength={taskRecordsPagingInfo?.page * taskRecordsPagingInfo?.pageSize || 0}
            next={() => {
                setPage((prevState: number) => prevState + 1);
            }}
            scrollThreshold={1}
            hasMore={
                taskRecordsPagingInfo?.page === taskRecordsPagingInfo?.totalPages ||
                taskRecordsPagingInfo?.page > taskRecordsPagingInfo?.totalPages
                    ? false
                    : true
            }
            loader={
                <span style={{ textAlign: 'center' }}>
                    <p>{t('mi-maintenance.Loading')}</p>
                </span>
            }
            height={
                currentDateType === EMobileCalendarType.Month
                    ? vhToPixels(100) - 483
                    : vhToPixels(100) - 230
            }
        >
            <div
                className={clsx(
                    { [classes.bodyContainerDay]: qpDateType === EMobileCalendarType.Day },
                    { [classes.bodyContainerWeek]: qpDateType === EMobileCalendarType.Week },
                    { [classes.bodyContainerMonth]: qpDateType === EMobileCalendarType.Month },
                    classes.paddingMarginSm,
                )}
            >
                <FitRelative>
                    <ScrollableContent hideScrollbar>
                        {taskRecordsGroupByDate
                            ?.sort((a: any, b: any) => b.key - a.key)
                            ?.map((taskRecordGroupByDate, index) => {
                                const isAllDay = taskRecordGroupByDate.value.filter(
                                    (x: any) => x.isAllDay,
                                );

                                return <div key={index}>{renderEvents(isAllDay, true)}</div>;
                            })}
                        {hasIsAllDayEvent && hasIsNotAllDayEvent && (
                            <div className={classes.cardContentPadding}>
                                <hr
                                    className={clsx({
                                        [classes.hrDivider]: true,
                                    })}
                                />
                            </div>
                        )}
                        {taskRecordsGroupByDate
                            ?.sort((a: any, b: any) => b.key - a.key)
                            ?.map((taskRecordGroupByDate, index) => {
                                const isNotAllDay = taskRecordGroupByDate.value.filter(
                                    (x: any) => !x.isAllDay,
                                );

                                return <div key={index}>{renderEvents(isNotAllDay, false)}</div>;
                            })}
                    </ScrollableContent>
                </FitRelative>
            </div>
        </InfiniteScroll>
    );
};

export default withRouter(memo(CalendarContent));
