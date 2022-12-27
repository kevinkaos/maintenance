import { memo, useCallback, useEffect, useMemo } from 'react';
import {
    palette,
    a11yProps,
    TabPanel,
    withStringEnumParam,
    spacing,
} from '@advifactory/ifp-ui-core';
import { createStyles, makeStyles, Paper, Tab, Tabs, Theme } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { QueryParam } from '../..';
import clsx from 'clsx';
import { useQueryParam, withDefault } from 'use-query-params';
import ItemsContent from './ItemsContent';
import {
    ETaskCategory,
    ETaskCheckItemStatus,
    ETaskStatus,
    Maybe,
    useTaskRecordLogByActionQuery,
    useTaskRecordWithLogsQuery,
} from 'graphqlApi';
import { useLocation } from 'react-router-dom';
import SecondaryHeader from '../../Layout/SecondaryHeader';
import { EStatusColor, images } from 'common';
import { useStyles as useStatusStyles } from '../InboxPage/InboxContent';
import { default as AdvCircleIcon } from 'components/AdvCIcon2Cycle';
import { DateTime } from 'luxon';
import ProblemsContent from './ProblemsContent';
import ReviewersContent from './ReviewersContent';
import TaskLogsContent from './TaskLogsContent';
import { getReviewerProgress } from 'views/Portal/TaskManagement/AllScheduled/CalendarDetailPage';
import { MODAL_TYPES, useGlobalModalContext } from 'helpers/context/GlobalModal';
import { getErrorContent } from 'helpers/utils';
import i18n from 'i18n';

export enum EDetailsTabType {
    Problems = 'Problems',
    Items = 'Items',
    Reviewers = 'Reviewers',
    TaskLogs = 'Task Logs',
}

const INBOX_TAB_TYPE_TEXT = {
    [EDetailsTabType.Problems]: i18n.t('mi-maintenance.problems'),
    [EDetailsTabType.Items]: i18n.t('mi-maintenance.items'),
    [EDetailsTabType.Reviewers]: i18n.t('mi-maintenance.reviewers'),
    [EDetailsTabType.TaskLogs]: i18n.t('mi-maintenance.task-logs'),
};

const useStyles = makeStyles(
    (theme: Theme) =>
        createStyles({
            bodyContainer: {
                height: `calc(100vh - 36px)`,
            },
            mobileBreadcrumbFontSize: {
                fontSize: '12px',
            },
            mobileDetailsHeader: {
                backgroundImage: `linear-gradient(289deg, ${palette.cyanBase}, ${palette.blueBase})`,
                minHeight: '132px',
                padding: spacing.spacingM,
            },
            iconSize: {
                width: '24px',
                height: '24px',
            },
            iconPaddingRight: {
                paddingRight: '8px',
            },
            tab: {
                maxWidth: '100%',
                '& .MuiTab-wrapper': {
                    justifyContent: 'center',
                    padding: '0 12px',
                    fontSize: '12px',
                },
            },
            muiTabsRoot: {
                width: '100%',
            },
            mobileHeaderMain: {
                color: palette.white,
                height: '32px',
                fontSize: '20px',
                fontWeight: 'bold',
                display: 'flex',
            },
            mobileHeaderIcons: {
                position: 'fixed',
                right: '24px',
            },
            flexColumn: {
                display: 'flex',
                flexDirection: 'column',
            },
            card: {
                position: 'relative',
                bottom: '36px',
                padding: spacing.spacingS,
                margin: spacing.spacingM,
                marginBottom: 0,
                marginTop: spacing.spacingS,
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
            },
            paddingRightSm: {
                paddingRight: spacing.spacingS,
            },
            grayDarker: {
                color: palette.grayDarker,
            },
            smallFont12: {
                fontSize: '12px',
            },
            flexAlignCenter: {
                display: 'flex',
                alignItems: 'center',
            },
            toolbar: {
                position: 'relative',
                bottom: '36px',
                borderBottom: `1px solid ${palette.grayBase}`,
            },
            positionFixedRight0: {
                marginLeft: 'auto',
                marginRight: '-12px',
                fontWeight: 'bold',
            },
            flexCenter: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            },
            paddingLeftSm: {
                paddingLeft: spacing.spacingS,
            },
            scheduledTime: {
                fontSize: '12px',
                fontWeight: 'normal',
                fontStretch: 'normal',
                fontStyle: 'normal',
                lineHeight: 1.5,
                letterSpacing: 'normal',
                color: palette.white,
            },
            opacityPointFive: {
                opacity: 0.5,
            },
            tabPanelPosition: {
                position: 'relative',
                bottom: '36px',
            },
            colorRedBase: {
                color: palette.redBase,
            },
            bold: {
                fontWeight: 'bold',
            },
        }),
    { name: 'DetailsPage' },
);

const DetailsPage = () => {
    const { t, i18n } = useTranslation();
    let IFPLang = i18n.language;
    const classes = useStyles();
    const statusClasses = useStatusStyles();
    function useQuery() {
        return new URLSearchParams(useLocation().search);
    }

    let query = useQuery();

    const [detailsTabType, setDetailsTabType] = useQueryParam(
        QueryParam.DetailsTabType,
        withDefault(withStringEnumParam(EDetailsTabType), EDetailsTabType.Items),
    );
    const { showModal } = useGlobalModalContext();

    const {
        data: taskRecordData,
        refetch: taskRecordRefetch,
        loading: taskRecordLoading,
        error: taskRecordError,
    } = useTaskRecordWithLogsQuery({
        variables: {
            id: query.get(QueryParam.taskRecordId)
                ? (query.get(QueryParam.taskRecordId) as string)
                : '',
        },
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
        notifyOnNetworkStatusChange: true,
    });

    useEffect(() => {
        if (taskRecordError) {
            showModal(MODAL_TYPES.DANGER_MODAL, {
                show: true,
                title: t(`mi-maintenance.GetTaskRecordError`),
                content: getErrorContent(taskRecordError).map((errorReason: string) =>
                    t(`mi-maintenance.${errorReason}`),
                ),
                closeText: t('mi-maintenance.DialogClose'),
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(taskRecordError, null, 2)]);

    const taskRecord = taskRecordData?.taskRecord;

    const {
        data: taskRecordLogsData,
        refetch: taskRecordLogsRefetch,
        error: taskRecordLogsError,
        loading: taskRecordLogsLoading,
    } = useTaskRecordLogByActionQuery({
        variables: { id: taskRecord?.id ?? '' },
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
        skip: !!!taskRecord?.id,
    });

    useEffect(() => {
        if (taskRecordLogsError) {
            showModal(MODAL_TYPES.DANGER_MODAL, {
                show: true,
                title: t(`mi-maintenance.GetTaskRecordLogsError`),
                content: getErrorContent(taskRecordLogsError).map((errorReason: string) =>
                    t(`mi-maintenance.${errorReason}`),
                ),
                closeText: t('mi-maintenance.DialogClose'),
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(taskRecordLogsError, null, 2)]);

    const doing = taskRecordLoading || taskRecordLogsLoading;

    const renderTabNumberByType = (tabType: EDetailsTabType) => {
        switch (tabType) {
            case EDetailsTabType.Problems:
                return taskRecord?.checkItems?.length;
            case EDetailsTabType.Items:
                return taskRecord?.checkItems?.length;
            case EDetailsTabType.Reviewers:
                return taskRecord?.reviewerUsers?.length;
            case EDetailsTabType.TaskLogs:
                return taskRecord?.logs?.length;
            default:
                return 0;
        }
    };

    const availableTabsBasedOnTaskCategory = useMemo(() => {
        const categoryArr =
            taskRecord?.category === ETaskCategory.Regular ||
            taskRecord?.category === ETaskCategory.Daily
                ? [EDetailsTabType.Items, EDetailsTabType.Reviewers, EDetailsTabType.TaskLogs]
                : [
                      EDetailsTabType.Problems,
                      EDetailsTabType.Items,
                      EDetailsTabType.Reviewers,
                      EDetailsTabType.TaskLogs,
                  ];

        return categoryArr;
    }, [taskRecord?.category]);

    function handleTabChange(type: EDetailsTabType) {
        return () => {
            setDetailsTabType(type, 'replaceIn');
        };
    }

    useEffect(() => {
        taskRecordRefetch();
        taskRecordLogsRefetch();
    }, [taskRecordRefetch, taskRecordLogsRefetch]);

    const machineImageUrl = taskRecord?.machine?.imageUrl;
    const machineName = taskRecord?.machine?.name;
    const location = taskRecord?.machine?.location
        .slice()
        .reverse()
        .map((location: any) => location.name)
        .join(' / ');

    // Check to see if task record is overdue
    const getIsOverdue = useCallback(
        (endDate: Maybe<string | undefined>, status: ETaskStatus | string) => {
            const timeNow = new Date().getTime();

            if (status === ETaskStatus.Completed || status === ETaskStatus.Cancelled) return false;

            return timeNow > new Date(endDate ?? timeNow).getTime();
        },
        [],
    );

    const getIsRejected = (checkItems: any[]) => {
        if (!checkItems.length) return false;
        return checkItems.some(
            (checkItem) => checkItem?.status === ETaskCheckItemStatus.Reassigned,
        );
    };

    const getIsFailed = (checkItems: any[]) => {
        if (!checkItems.length) return false;
        return checkItems.some((checkItem) => checkItem?.status === ETaskCheckItemStatus.Fail);
    };

    const isOverdue = getIsOverdue(taskRecord?.dateRange?.endDate, taskRecord?.status ?? '');
    const isRejected = getIsRejected((taskRecord?.checkItems as any[]) ?? []);
    const isFailed = getIsFailed((taskRecord?.checkItems as any[]) ?? []);
    const color =
        isOverdue || isRejected || isFailed
            ? EStatusColor.Red
            : taskRecord?.status === ETaskStatus.Assigned
            ? EStatusColor.Yellow
            : taskRecord?.status === ETaskStatus.Completed
            ? EStatusColor.Green
            : taskRecord?.status === ETaskStatus.InReview
            ? EStatusColor.Blue
            : taskRecord?.status === ETaskStatus.Cancelled
            ? EStatusColor.Gray
            : taskRecord?.status === ETaskStatus.InProgress
            ? EStatusColor.Orange
            : EStatusColor.Red;

    return (
        <div className={classes.bodyContainer}>
            <SecondaryHeader taskNo={taskRecord?.taskNo} />
            <div
                className={clsx(classes.mobileDetailsHeader, statusClasses[color as EStatusColor])}
            >
                <div className={classes.flexAlignCenter}>
                    <div className={classes.mobileHeaderMain}>
                        <div>
                            {ETaskCategory.Repair === taskRecord?.category
                                ? t('mi-maintenance.Repair')
                                : t('mi-maintenance.Maintenance')}
                        </div>
                    </div>
                    <div
                        className={clsx(
                            statusClasses.taskRecordStatusIconDetailsPage,
                            classes.positionFixedRight0,
                            classes.flexCenter,
                        )}
                    >
                        <AdvCircleIcon
                            colorOutside={palette.white}
                            colorInside={palette.white}
                            colorMiddle={palette.yellowBase}
                        />
                        {isOverdue ? (
                            <span className={classes.paddingLeftSm}>
                                {t('mi-maintenance.overdue')}
                            </span>
                        ) : isFailed ? (
                            <span className={classes.paddingLeftSm}>
                                {t('mi-maintenance.failed')}
                            </span>
                        ) : isRejected ? (
                            <span className={classes.paddingLeftSm}>
                                {t('mi-maintenance.rejected')}
                            </span>
                        ) : (
                            <span className={clsx(classes.paddingLeftSm)}>
                                {t(`mi-maintenance.${taskRecord?.status?.replace(/\s+/g, '')}`) +
                                    getReviewerProgress(taskRecord)}
                            </span>
                        )}
                    </div>
                </div>
                <div
                    className={clsx(classes.scheduledTime, classes.bold, {
                        [classes.colorRedBase]: isOverdue,
                    })}
                >
                    {DateTime.fromISO(taskRecord?.dateRange?.startDate ?? new Date().toISOString())
                        .setLocale(IFPLang)
                        .toFormat('D T')}{' '}
                    ~{' '}
                    {DateTime.fromISO(taskRecord?.dateRange?.endDate ?? new Date().toISOString())
                        .setLocale(IFPLang)
                        .toFormat('D T')}
                </div>
                <div className={clsx(classes.scheduledTime, classes.opacityPointFive)}>
                    {`${t('mi-maintenance.creator')}: ${taskRecord?.createdUser?.name}`}
                </div>
                <div className={clsx(classes.scheduledTime, classes.opacityPointFive)}>
                    {`${t('mi-maintenance.created-at')}: ${DateTime.fromISO(
                        taskRecord?.createdAt ?? new Date().toISOString(),
                    )
                        .setLocale(IFPLang)
                        .toFormat('D TT')}`}
                </div>
            </div>
            <Paper variant="outlined" className={classes.card}>
                <div className={classes.machineInformation}>
                    <img
                        className={clsx(classes.machineImage, {
                            [classes.machineDefaultImage]: !!!machineImageUrl,
                        })}
                        src={machineImageUrl || images.ImgMainImage}
                        alt={machineImageUrl ? machineName : 'machine default photo'}
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
                    </div>
                </div>
            </Paper>
            <div className={classes.toolbar}>
                <Tabs
                    variant="fullWidth"
                    centered
                    value={detailsTabType}
                    classes={{ root: classes.muiTabsRoot }}
                >
                    {availableTabsBasedOnTaskCategory.map((type) => (
                        <Tab
                            fullWidth
                            key={type}
                            component="div"
                            value={type}
                            label={
                                <div className={classes.flexColumn}>
                                    {renderTabNumberByType(type)}
                                    <span>{t(INBOX_TAB_TYPE_TEXT[type as EDetailsTabType])}</span>
                                </div>
                            }
                            disabled={doing}
                            onClick={handleTabChange(type)}
                            className={classes.tab}
                            {...a11yProps(type)}
                        />
                    ))}
                </Tabs>
            </div>

            <TabPanel
                value={detailsTabType}
                className={classes.tabPanelPosition}
                index={EDetailsTabType.Problems}
                key={EDetailsTabType.Problems}
            >
                <ProblemsContent doing={doing} taskRecord={taskRecord} />
            </TabPanel>
            <TabPanel
                value={detailsTabType}
                className={classes.tabPanelPosition}
                index={EDetailsTabType.Items}
                key={EDetailsTabType.Items}
            >
                <ItemsContent
                    doing={doing}
                    taskRecordRefetch={async () => {
                        await taskRecordRefetch();
                        await taskRecordLogsRefetch();
                    }}
                    taskRecord={taskRecord}
                    taskRecordLogsData={taskRecordLogsData}
                />
            </TabPanel>
            <TabPanel
                value={detailsTabType}
                className={classes.tabPanelPosition}
                index={EDetailsTabType.Reviewers}
                key={EDetailsTabType.Reviewers}
            >
                <ReviewersContent doing={doing} taskRecord={taskRecord} />
            </TabPanel>
            <TabPanel
                value={detailsTabType}
                className={classes.tabPanelPosition}
                index={EDetailsTabType.TaskLogs}
                key={EDetailsTabType.TaskLogs}
            >
                <TaskLogsContent doing={doing} taskRecord={taskRecord} />
            </TabPanel>
        </div>
    );
};

export default memo(DetailsPage);
