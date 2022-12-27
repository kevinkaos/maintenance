import {
    FitRelative,
    LoadingArea,
    palette,
    ScrollableContent,
    spacing,
} from '@advifactory/ifp-ui-core';
import { createStyles, makeStyles, Paper, Theme, Link } from '@material-ui/core';
import clsx from 'clsx';
import { images, ButtonVariant, Button, EStatusColor } from 'common';
import { EUserRole } from 'genres';
import {
    ETaskCategory,
    ETaskCheckItemStatus,
    ETaskRecordCheckItemAction,
    ETaskStatus,
    Maybe,
    TaskRecord,
    TaskRecordCheckItem,
    useUpdateTaskRecordCheckItemsMutation,
} from 'graphqlApi';
import { DateTime } from 'luxon';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { withRouter, Link as RouterLink, useLocation } from 'react-router-dom';
import { getReviewerProgress } from 'views/Portal/TaskManagement/AllScheduled/CalendarDetailPage';
import { EInboxTabType } from '.';
import { QueryParam, routePaths } from '../..';
import PassFailConfirmDialog from '../../dialogs/PassFailConfirmDialog';
import InfiniteScroll from 'react-infinite-scroll-component';
import { MODAL_TYPES, useGlobalModalContext } from 'helpers/context/GlobalModal';
import { getErrorContent } from 'helpers/utils';
import RejectConfirmDialog from '../../dialogs/RejectConfirmDialog';

function createColorStyles({ backgroundColor }: { backgroundColor?: string }) {
    return createStyles({
        '& $taskRecordStatusIcon': {
            backgroundColor: backgroundColor,
        },
        '& $taskRecordStatusIconDetailsPage': {
            backgroundColor: backgroundColor,
        },
    });
}

export const useStyles = makeStyles(
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
            bodyContainer: {
                flexGrow: 1,
                flexShrink: 0,
                position: 'relative',
                height: `calc(100vh - 230px)`,
            },
            card: {
                padding: spacing.spacingS,
                margin: spacing.spacingS,
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
                border: 'none',
                height: '1px',
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
            taskRecordStatusIconDetailsPage: {
                height: '24px',
                paddingLeft: '6px',
                paddingRight: '12px',
                borderTopLeftRadius: '12px',
                borderBottomLeftRadius: '12px',
                color: palette.white,
            },
            flexAlignCenter: {
                display: 'flex',
            },
            paddingRightSm: {
                paddingRight: spacing.spacingS,
            },
        }),
    { name: 'InboxPage' },
);

export function vhToPixels(vh: number) {
    return Math.round(window.innerHeight / (100 / vh));
}

const InboxContent = (props: any) => {
    const classes = useStyles();
    const { t, i18n } = useTranslation();
    let IFPLang = i18n.language;
    const {
        taskRecords: taskRecordsProp,
        doing: doingProp,
        mobileSummaryRefetch,
        taskRecordsRefetch,
        taskRecordsPagingInfo,
        setPage,
        page,
    } = props;
    const { search } = useLocation();
    const [taskRecordState, setTaskRecordState] = useState<TaskRecord>();
    // const [comment, setComment] = useState<string>('');
    const [rejectComment, setRejectComment] = useState<string>('');
    const [taskRecords, setTaskRecords] = useState<any[]>([]);
    const [action, setAction] = useState<ETaskRecordCheckItemAction>(
        ETaskRecordCheckItemAction.Pass,
    );
    const [isOpenPassFailConfirmDialog, setIsOpenPassFailConfirmDialog] = useState(false);
    const [isOpenRejectConfirmDialog, setIsOpenRejectConfirmDialog] = useState(false);
    function useQuery() {
        return new URLSearchParams(search);
    }
    let query = useQuery();
    const { showModal } = useGlobalModalContext();

    const roleQP = query.get(QueryParam.Role);
    const inboxTabTypeQP = query.get(QueryParam.InboxTabType);
    const [
        updateTaskRecordCheckItemsMutation,
        { loading: updateTaskRecordCheckItemsLoading, error: updateTaskRecordCheckItemsError },
    ] = useUpdateTaskRecordCheckItemsMutation({ errorPolicy: 'all' });

    useEffect(() => {
        if (updateTaskRecordCheckItemsError) {
            showModal(MODAL_TYPES.DANGER_MODAL, {
                show: true,
                title: t(`mi-maintenance.UpdateTaskRecordItemsError`),
                content: getErrorContent(updateTaskRecordCheckItemsError).map(
                    (errorReason: string) => t(`mi-maintenance.${errorReason}`),
                ),
                closeText: t('mi-maintenance.DialogClose'),
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(updateTaskRecordCheckItemsError, null, 2)]);

    const doing = doingProp || updateTaskRecordCheckItemsLoading;

    const getActionButtons = (taskRecord: any) => {
        const taskRecordId = taskRecord.id;

        switch (roleQP) {
            case EUserRole.Creator:
                switch (inboxTabTypeQP) {
                    case EInboxTabType.Doing:
                        return (
                            <Link
                                component={RouterLink}
                                to={routePaths.detailsByTaskRecordId(taskRecordId, search)}
                            >
                                <Button
                                    className={classes.actionButtons}
                                    variant={ButtonVariant.TextFilledBlue}
                                    disabled={doing}
                                    startIcon={<images.BtnMobileMainStartN />}
                                >
                                    <span>{t('mi-maintenance.Start')}</span>
                                </Button>
                            </Link>
                        );
                    case EInboxTabType.Done:
                        break;
                    default:
                        break;
                }
                break;
            case EUserRole.Maintainer:
                switch (inboxTabTypeQP) {
                    case EInboxTabType.New:
                        return (
                            <>
                                <Button
                                    className={classes.actionButtons}
                                    variant={ButtonVariant.TextOutlineRed}
                                    disabled={doing}
                                    onClick={async () => {
                                        setTaskRecordState(taskRecord);
                                        setIsOpenRejectConfirmDialog(true);
                                    }}
                                    startIcon={<images.BtnMobileMainFailRedLightN />}
                                >
                                    <span>{t('mi-maintenance.RejectBtn')}</span>
                                </Button>
                                <Link
                                    component={RouterLink}
                                    to={routePaths.detailsByTaskRecordId(taskRecordId, search)}
                                >
                                    <Button
                                        className={classes.actionButtons}
                                        variant={ButtonVariant.TextFilledBlue}
                                        disabled={doing}
                                        startIcon={<images.BtnMobileMainStartN />}
                                    >
                                        <span>{t('mi-maintenance.Start')}</span>
                                    </Button>
                                </Link>
                            </>
                        );
                    case EInboxTabType.Doing:
                        return (
                            <Link
                                component={RouterLink}
                                to={routePaths.detailsByTaskRecordId(taskRecordId, search)}
                            >
                                <Button
                                    className={classes.actionButtons}
                                    variant={ButtonVariant.TextFilledBlue}
                                    disabled={doing}
                                    startIcon={<images.BtnMobileMainStartN />}
                                >
                                    <span>{t('mi-maintenance.Continue')}</span>
                                </Button>
                            </Link>
                        );
                    case EInboxTabType.Done:

                        return false;
                    default:
                        return false;
                }
            case EUserRole.Reviewer:
                switch (inboxTabTypeQP) {
                    case EInboxTabType.New:
                        break;
                    case EInboxTabType.Doing:
                        return (
                            <>
                                <Button
                                    className={classes.actionButtons}
                                    variant={ButtonVariant.TextOutlineGreen}
                                    disabled={doing}
                                    onClick={() => {
                                        setTaskRecordState(taskRecord);
                                        setIsOpenPassFailConfirmDialog(true);
                                        setAction(ETaskRecordCheckItemAction.Pass);
                                    }}
                                    startIcon={<images.BtnMobileMainPassGreenLightN />}
                                >
                                    <span>{t('mi-maintenance.pass-button')}</span>
                                </Button>
                                <Button
                                    className={classes.actionButtons}
                                    variant={ButtonVariant.TextOutlineRed}
                                    disabled={doing}
                                    onClick={() => {
                                        setTaskRecordState(taskRecord);
                                        setIsOpenPassFailConfirmDialog(true);
                                        setAction(ETaskRecordCheckItemAction.Fail);
                                    }}
                                    startIcon={<images.BtnMobileMainFailRedLightN />}
                                >
                                    <span>{t('mi-maintenance.fail-button')}</span>
                                </Button>
                                <Link
                                    component={RouterLink}
                                    to={routePaths.detailsByTaskRecordId(taskRecordId, search)}
                                >
                                    <Button
                                        className={classes.actionButtons}
                                        variant={ButtonVariant.TextFilledBlue}
                                        disabled={doing}
                                        startIcon={<images.BtnMobileMainStartN />}
                                    >
                                        <span>{t('mi-maintenance.Start')}</span>
                                    </Button>
                                </Link>
                            </>
                        );
                    case EInboxTabType.Done:
                        break;
                    default:
                        break;
                }
                break;
            default:
                break;
        }
    };

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
            const assignedDate = DateTime.fromISO(taskRecord.createdAt)
                .startOf('day')
                .toJSDate()
                .getTime();
            return { ...taskRecord, assignedDate };
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
            height={vhToPixels(100) - 230}
        >
            <div className={clsx(classes.bodyContainer, classes.paddingMarginSm)}>
                <FitRelative>
                    <ScrollableContent hideScrollbar>
                        {taskRecordsGroupByDate
                            ?.sort((a: any, b: any) => a.key - b.key)
                            ?.map((taskRecordGroupByDate, index) => {
                                const dateSegregation = DateTime.fromMillis(
                                    taskRecordGroupByDate.key,
                                )
                                    .setLocale(IFPLang ?? 'en-US')
                                    .toLocaleString(DateTime.DATE_MED);

                                return (
                                    <div key={index}>
                                        {
                                            <div
                                                className={clsx(
                                                    classes.paddingMarginSm,
                                                    classes.boldGrayDarker,
                                                    classes.marginTopBottomXs,
                                                )}
                                            >
                                                {dateSegregation}
                                            </div>
                                        }
                                        {taskRecordGroupByDate.value
                                            .sort(
                                                (a: any, b: any) =>
                                                    new Date(a.createdAt).getTime() -
                                                    new Date(b.createdAt).getTime(),
                                            )
                                            .map((taskRecord: any) => {
                                                const machineImageUrl = taskRecord.machine.imageUrl;
                                                const machineName = taskRecord.machine.name;
                                                const status = taskRecord.status;
                                                const location = taskRecord.machine.location
                                                    .slice()
                                                    .reverse()
                                                    .map((location: any) => location.name)
                                                    .join(' / ');
                                                const dueDate = DateTime.fromISO(
                                                    taskRecord.dateRange.endDate,
                                                )
                                                    .setLocale(IFPLang ?? 'en-US')
                                                    .toLocaleString(
                                                        DateTime.DATETIME_SHORT_WITH_SECONDS,
                                                    );
                                                const notCancelledOrCompleted =
                                                    taskRecord?.status !== ETaskStatus.Cancelled &&
                                                    taskRecord?.status !== ETaskStatus.Completed;
                                                const isOverdue =
                                                    getIsOverdue(
                                                        taskRecord.dateRange?.endDate,
                                                        taskRecord.status,
                                                    ) && notCancelledOrCompleted;
                                                const isRejectedCount = getIsRejected(
                                                    taskRecord?.checkItems,
                                                );
                                                const isRejected =
                                                    isRejectedCount > 0 && notCancelledOrCompleted;
                                                const isFailedCount = getIsFailed(
                                                    taskRecord?.checkItems,
                                                );
                                                const isFailed =
                                                    isFailedCount > 0 && notCancelledOrCompleted;

                                                const color =
                                                    taskRecord.status === ETaskStatus.Assigned
                                                        ? EStatusColor.Yellow
                                                        : taskRecord.status ===
                                                          ETaskStatus.Completed
                                                        ? EStatusColor.Green
                                                        : taskRecord.status === ETaskStatus.InReview
                                                        ? EStatusColor.Blue
                                                        : taskRecord.status ===
                                                          ETaskStatus.Cancelled
                                                        ? EStatusColor.Gray
                                                        : EStatusColor.Orange;

                                                return (
                                                    <Paper
                                                        id={taskRecord.taskNo}
                                                        variant="outlined"
                                                        key={taskRecord.taskNo}
                                                        className={clsx(
                                                            classes.card,
                                                            {
                                                                [classes.borderLeftMaintenance]:
                                                                    taskRecord?.category !==
                                                                    ETaskCategory.Repair,
                                                            },
                                                            {
                                                                [classes.borderLeftRepair]:
                                                                    taskRecord?.category ===
                                                                    ETaskCategory.Repair,
                                                            },
                                                            classes[color as EStatusColor],
                                                        )}
                                                    >
                                                        <Link
                                                            component={RouterLink}
                                                            to={routePaths.detailsByTaskRecordId(
                                                                taskRecord?.id ?? '',
                                                                search,
                                                            )}
                                                            style={{ textDecoration: 'none' }}
                                                        >
                                                            {isOverdue ? (
                                                                <span
                                                                    className={classes.overdueIcon}
                                                                >
                                                                    {t('mi-maintenance.overdue')}
                                                                </span>
                                                            ) : isFailed ? (
                                                                <span
                                                                    className={classes.overdueIcon}
                                                                >
                                                                    {t('mi-maintenance.failed') +
                                                                        ` (${isFailedCount})`}
                                                                </span>
                                                            ) : isRejected ? (
                                                                <span
                                                                    className={classes.overdueIcon}
                                                                >
                                                                    {t('mi-maintenance.rejected') +
                                                                        ` (${isRejectedCount})`}
                                                                </span>
                                                            ) : (
                                                                <span
                                                                    className={clsx(
                                                                        classes.taskRecordStatusIcon,
                                                                    )}
                                                                >
                                                                    {t(
                                                                        `mi-maintenance.${status?.replace(
                                                                            /\s+/g,
                                                                            '',
                                                                        )}`,
                                                                    ) +
                                                                        getReviewerProgress(
                                                                            taskRecord,
                                                                        )}
                                                                </span>
                                                            )}
                                                            <span
                                                                className={clsx(
                                                                    classes.boldGrayDarker,
                                                                    classes.smallFont12,
                                                                )}
                                                            >
                                                                #{taskRecord.taskNo}
                                                            </span>
                                                            <div
                                                                className={
                                                                    classes.machineInformation
                                                                }
                                                            >
                                                                
                                                                <img
                                                                    className={clsx(
                                                                        classes.machineImage,
                                                                        {
                                                                            [classes.machineDefaultImage]:
                                                                                !!!machineImageUrl,
                                                                        },
                                                                    )}
                                                                    src={
                                                                        machineImageUrl ||
                                                                        images.ImgMainImage
                                                                    }
                                                                    alt={
                                                                        machineImageUrl
                                                                            ? machineName
                                                                            : 'machine default photo'
                                                                    }
                                                                />
                                                                <div>
                                                                    <div
                                                                        className={
                                                                            classes.machineName
                                                                        }
                                                                    >
                                                                        {machineName}
                                                                    </div>
                                                                    <div
                                                                        className={clsx(
                                                                            classes.smallFont12,
                                                                            classes.grayDarker,
                                                                            classes.flexAlignCenter,
                                                                        )}
                                                                    >
                                                                        <span
                                                                            className={
                                                                                classes.paddingRightSm
                                                                            }
                                                                        >
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
                                                                        <span
                                                                            className={
                                                                                classes.paddingRightSm
                                                                            }
                                                                        >
                                                                            <images.ImgMobileMainCalendarMGrayDark />
                                                                        </span>
                                                                        {t('mi-maintenance.Due')}:{' '}
                                                                        {dueDate}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                        {getActionButtons(taskRecord) && (
                                                            <div
                                                                className={
                                                                    classes.cardContentPadding
                                                                }
                                                            >
                                                                <hr
                                                                    className={classes.hrDivider}
                                                                    color={palette.grayBase}
                                                                />
                                                            </div>
                                                        )}
                                                        <div className={classes.justifyFlexEnd}>
                                                            {getActionButtons(taskRecord)}
                                                        </div>
                                                    </Paper>
                                                );
                                            })}
                                    </div>
                                );
                            })}
                    </ScrollableContent>
                </FitRelative>
                <PassFailConfirmDialog
                    open={isOpenPassFailConfirmDialog}
                    comment={rejectComment}
                    setComment={setRejectComment}
                    taskRecord={taskRecordState}
                    passOrFail={action}
                    onSubmit={async () => {
                        if (
                            !!!taskRecordState?.checkItems?.length ||
                            (action === ETaskRecordCheckItemAction.Fail && rejectComment === '')
                        )
                            return;
                        const checkItems = taskRecordState.checkItems.map(
                            (checkItem: TaskRecordCheckItem) => {
                                return {
                                    id: checkItem.taskCheckItem.id,
                                    remark: rejectComment ?? '',
                                    isChecked: true,
                                };
                            },
                        );
                        setRejectComment('');
                        // setComment('');
                        await updateTaskRecordCheckItemsMutation({
                            variables: {
                                input: {
                                    taskRecordId: taskRecordState?.id ?? '',
                                    action: action,
                                    checkItems,
                                },
                            },
                        });
                        await mobileSummaryRefetch();
                        await taskRecordsRefetch();
                    }}
                    onClose={() => {
                        setIsOpenPassFailConfirmDialog(false);
                        // setComment('');
                        setRejectComment('');
                    }}
                />
                <RejectConfirmDialog
                    rejectAll={true}
                    open={isOpenRejectConfirmDialog}
                    comment={rejectComment}
                    setComment={setRejectComment}
                    taskRecord={taskRecordState}
                    onSubmit={async () => {
                        const checkItems = taskRecordState?.checkItems
                            ?.filter((x: any) => x.status === ETaskStatus.Assigned)
                            ?.map((checkItem: any) => ({
                                id: checkItem.taskCheckItem.id,
                                remark: rejectComment ?? '',
                            }));
                        await updateTaskRecordCheckItemsMutation({
                            variables: {
                                input: {
                                    taskRecordId: taskRecordState?.id ?? '',
                                    action: ETaskRecordCheckItemAction.Reassign,
                                    checkItems: checkItems ?? [],
                                },
                            },
                        });
                        await taskRecordsRefetch();
                        await mobileSummaryRefetch();
                    }}
                    onClose={() => {
                        setIsOpenRejectConfirmDialog(false);
                        setRejectComment('');
                    }}
                />
            </div>
        </InfiniteScroll>
    );
};

export default withRouter(memo(InboxContent));
