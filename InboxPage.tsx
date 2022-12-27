import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
    IfpToolbar,
    BreadcrumbLink,
    palette,
    IfpIconButton,
    IfpToolbarVariant,
    a11yProps,
    TabPanel,
    withStringEnumParam,
} from '@advifactory/ifp-ui-core';
import {
    Breadcrumbs,
    createStyles,
    makeStyles,
    Tab,
    Tabs,
    Theme,
    Typography,
} from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { MainFooter, QueryParam, routePaths } from '../..';
import MainHeader from '../../Layout/MainHeader';
import { AdvIcons } from 'components';
import clsx from 'clsx';
import { useQueryParam, withDefault } from 'use-query-params';
import { EMobileTaskTabType } from 'genres/mobile-layout';
import InboxContent from './InboxContent';
import { EUserRole } from 'genres';
import { useCurrentRole } from 'common/components/MobileGlobalState';
import {
    EActionStatus,
    ERole,
    ESortOrder,
    ETaskCategory,
    ETaskStatus,
    useTaskRecordsMobileQuery,
    useTaskRecordsMobileSummaryLazyQuery,
} from 'graphqlApi';
import { useUser } from 'contexts/UserHooks';
import { useLocation } from 'react-router-dom';
import SearchBar from '../../dialogs/SearchBar';
import { MODAL_TYPES, useGlobalModalContext } from 'helpers/context/GlobalModal';
import { getErrorContent } from 'helpers/utils';
import i18n from 'i18n';

export enum EInboxTabType {
    New = 'New',
    Doing = 'Doing',
    Done = 'Done',
}

const INBOX_TAB_TYPE_TEXT = {
    [EInboxTabType.New]: i18n.t('mi-maintenance.new'),
    [EInboxTabType.Doing]: i18n.t('mi-maintenance.doing'),
    [EInboxTabType.Done]: i18n.t('mi-maintenance.done'),
};

const useStyles = makeStyles(
    (theme: Theme) =>
        createStyles({
            mobileBreadcrumbFontSize: {
                fontSize: '12px',
            },
            mobileBreadCrumbBgColor: {
                backgroundColor: palette.grayLight,
                marginTop: '2px',
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
                },
            },
            muiTabsRoot: {
                width: '100%',
            },
            mobileHeaderMain: {
                height: '32px',
                fontSize: '20px',
                fontWeight: 'bold',
                display: 'flex',
            },
            mobileHeaderIcons: {
                marginLeft: 'auto',
            },
        }),
    { name: 'InboxPage' },
);

const InboxPage = () => {
    const { t } = useTranslation();
    const classes = useStyles();
    const { currentRole } = useCurrentRole();
    const { search: locationSearch } = useLocation();
    const user = useUser();
    const initialUserRole = useMemo(
        () => (user.roles?.length ? user.roles[0] : EUserRole.None),
        [user.roles],
    );
    const useQuery = () => {
        return new URLSearchParams(locationSearch);
    };

    let query = useQuery();
    const initialInboxTabType = useMemo(() => {
        return query.get(QueryParam.InboxTabType)
            ? (query.get(QueryParam.InboxTabType) as EInboxTabType)
            : currentRole === EUserRole.None
            ? initialUserRole === EUserRole.Creator || initialUserRole === EUserRole.Reviewer
                ? EInboxTabType.Doing
                : EInboxTabType.New
            : currentRole === EUserRole.Creator || currentRole === EUserRole.Reviewer
            ? EInboxTabType.Doing
            : EInboxTabType.New;
    }, [currentRole, initialUserRole, query]);

    const initialQueryParamRole = useMemo(() => {
        return query.get(QueryParam.Role)
            ? (query.get(QueryParam.Role) as EUserRole)
            : currentRole === EUserRole.None
            ? initialUserRole
            : (currentRole as EUserRole);
    }, [currentRole, initialUserRole, query]);

    // query params
    const [inboxTabType, setInboxTabType] = useQueryParam(
        QueryParam.InboxTabType,
        withDefault(withStringEnumParam(EInboxTabType), initialInboxTabType),
    );
    const [queryParamRole, setQueryParamRole] = useQueryParam(
        QueryParam.Role,
        withDefault(withStringEnumParam(EUserRole), initialQueryParamRole),
    );

    useEffect(() => {
        // initialize query params
        setQueryParamRole(initialQueryParamRole, 'replaceIn');
        setInboxTabType(initialInboxTabType, 'replaceIn');
    }, [initialInboxTabType, initialQueryParamRole, setInboxTabType, setQueryParamRole]);

    const getStateBasedOnRoleAndTabType = useCallback(() => {
        let actionStatus: EActionStatus | undefined | EInboxTabType =
            queryParamRole === EUserRole.Creator || queryParamRole === EUserRole.Reviewer
                ? EActionStatus.ToDo
                : inboxTabType;
        let taskStatuses: ETaskStatus[] = [];
        let availableTabsBasedOnCurrentRole: any[] = [];
        switch (currentRole) {
            case EUserRole.Creator:
                availableTabsBasedOnCurrentRole = [EInboxTabType.Doing, EInboxTabType.Done];
                switch (inboxTabType) {
                    case EInboxTabType.Doing:
                        taskStatuses = [ETaskStatus.InProgress];
                        actionStatus = EActionStatus.ToDo;
                        break;
                    case EInboxTabType.Done:
                        taskStatuses = [];
                        actionStatus = inboxTabType;
                        break;

                    default:
                        break;
                }
                break;
            case EUserRole.Maintainer:
                availableTabsBasedOnCurrentRole = [
                    EInboxTabType.New,
                    EInboxTabType.Doing,
                    EInboxTabType.Done,
                ];
                switch (inboxTabType) {
                    case EInboxTabType.New:
                        taskStatuses = [ETaskStatus.Assigned];
                        actionStatus = inboxTabType;
                        break;
                    case EInboxTabType.Doing:
                        taskStatuses = [ETaskStatus.InProgress];
                        actionStatus = EActionStatus.ToDo;
                        break;
                    case EInboxTabType.Done:
                        taskStatuses = [
                            ETaskStatus.InReview,
                            ETaskStatus.Completed,
                            ETaskStatus.Cancelled,
                        ];
                        actionStatus = inboxTabType;
                        break;

                    default:
                        break;
                }
                break;
            case EUserRole.Reviewer:
                availableTabsBasedOnCurrentRole = [EInboxTabType.Doing, EInboxTabType.Done];
                switch (inboxTabType) {
                    case EInboxTabType.New:
                        taskStatuses = [ETaskStatus.InReview];
                        actionStatus = EActionStatus.New;
                        break;
                    case EInboxTabType.Doing:
                        taskStatuses = [ETaskStatus.InReview];
                        actionStatus = EActionStatus.ToDo;
                        break;
                    case EInboxTabType.Done:
                        taskStatuses = [ETaskStatus.Completed, ETaskStatus.Cancelled];
                        actionStatus = inboxTabType;
                        break;

                    default:
                        break;
                }
                break;
            case EUserRole.Requester:
                break;
            case EUserRole.NotifyParty:
                break;

            default:
                break;
        }

        return { taskStatuses, actionStatus, availableTabsBasedOnCurrentRole };
    }, [currentRole, inboxTabType, queryParamRole]);

    const { actionStatus, availableTabsBasedOnCurrentRole } = getStateBasedOnRoleAndTabType();
    const { showModal } = useGlobalModalContext();

    const [maintainerUserIds, setMaintainerUserIds] = useState<string[]>([]);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [statusFilter, setStatusFilter] = useState<ETaskStatus[]>([
        ETaskStatus.Assigned,
        ETaskStatus.InProgress,
        ETaskStatus.InReview,
        ETaskStatus.Completed,
    ]);
    const [taskCategories] = useState<ETaskCategory[]>([
        ETaskCategory.Daily,
        ETaskCategory.Regular,
        ETaskCategory.Annual,
        ETaskCategory.Repair,
    ]);
    const [search, setSearch] = useState<string>('');
    const [isOpenSearchBar, setIsOpenSearchBar] = useState<boolean>(false);
    const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
    const [activeSort, setActiveSort] = useState<string | undefined>(void 0);
    const [sortingOrder, setSortingOrder] = useState(ESortOrder.Desc);
    const [dateRange, setDateRange] = useState<{
        startDate: Date | undefined;
        endDate: Date | undefined;
    }>({ startDate: void 0, endDate: void 0 });

    const [
        taskRecordMobileSummaryLazyQuery,
        {
            data: mobileSummaryData,
            // loading: mobileSummaryLoading,
            refetch: mobileSummaryRefetch,
            error: mobileSummaryError,
        },
    ] = useTaskRecordsMobileSummaryLazyQuery({
        variables: {
            filterInput: {
                role: currentRole as ERole,
            },
        },
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
    });

    useEffect(() => {
        if (mobileSummaryError) {
            showModal(MODAL_TYPES.DANGER_MODAL, {
                show: true,
                title: t(`mi-maintenance.GetTaskRecordsError`),
                content: getErrorContent(mobileSummaryError).map((errorReason: string) =>
                    t(`mi-maintenance.${errorReason}`),
                ),
                closeText: t('mi-maintenance.DialogClose'),
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(mobileSummaryError, null, 2)]);

    const isSkipQuery =
        currentRole === EUserRole.None ||
        actionStatus === void 0 ||
        (inboxTabType === EInboxTabType.Doing
            ? actionStatus !== EActionStatus.ToDo
            : inboxTabType !== actionStatus);

    const {
        data: taskRecordsData,
        loading: taskRecordsLoading,
        refetch: taskRecordsRefetch,
        error: taskRecordsError,
    } = useTaskRecordsMobileQuery({
        variables: {
            pagingInput: {
                page: page + 1,
                pageSize: pageSize,
            },
            sortingInput: {
                field: activeSort,
                order: sortingOrder,
            },
            filterInput: {
                searchText: search === '' ? void 0 : search,
                statuses: statusFilter,
                categories: taskCategories,
                machineIds: selectedMachineIds,
                maintainerUserIds: maintainerUserIds,
                role: currentRole as ERole,
                actionStatus: actionStatus as EActionStatus,
                dateRange: {
                    startDate: dateRange.startDate
                        ? new Date(dateRange.startDate).toISOString()
                        : void 0,
                    endDate: dateRange.endDate ? new Date(dateRange.endDate).toISOString() : void 0,
                },
            },
        },
        skip: isSkipQuery,
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
        notifyOnNetworkStatusChange: true,
    });

    useEffect(() => {
        if (taskRecordsError) {
            showModal(MODAL_TYPES.DANGER_MODAL, {
                show: true,
                title: t(`mi-maintenance.GetTaskRecordsError`),
                content: getErrorContent(taskRecordsError).map((errorReason: string) =>
                    t(`mi-maintenance.${errorReason}`),
                ),
                closeText: t('mi-maintenance.DialogClose'),
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(taskRecordsError, null, 2)]);

    const taskRecordsPagingInfo = taskRecordsData?.taskRecords?.pagingInfo;
    const inboxSummary = mobileSummaryData?.taskRecords?.inboxSummary?.needProcessCount;
    const taskRecords = taskRecordsData?.taskRecords?.results ?? [];
    const doing = taskRecordsLoading;

    const inboxCount = useMemo(() => {
        return inboxSummary;
    }, [inboxSummary]);

    function handleTabChange(type: EInboxTabType) {
        return () => {
            setPage(0);
            setInboxTabType(type, 'replaceIn');
            setQueryParamRole(currentRole as EUserRole, 'replaceIn');
        };
    }

    useEffect(() => {
        if (currentRole === EUserRole.None) return;
        taskRecordMobileSummaryLazyQuery();
    }, [currentRole, inboxTabType, taskRecordMobileSummaryLazyQuery]);

    useEffect(() => {
        getStateBasedOnRoleAndTabType();
        taskRecordsRefetch();
    }, [getStateBasedOnRoleAndTabType, taskRecordsRefetch]);

    return (
        <div>
            <MainHeader />
            <IfpToolbar
                variant={IfpToolbarVariant.Large}
                className={classes.mobileBreadCrumbBgColor}
            >
                <div style={{ width: '100%' }}>
                    <Breadcrumbs classes={{ root: classes.mobileBreadcrumbFontSize }}>
                        <BreadcrumbLink
                            to={routePaths.home}
                            classes={{ root: classes.mobileBreadcrumbFontSize }}
                        >
                            {t('mi-maintenance.NavigationTask')}
                        </BreadcrumbLink>
                        <Typography
                            variant="h5"
                            color="textPrimary"
                            classes={{ root: classes.mobileBreadcrumbFontSize }}
                        >
                            {t('mi-maintenance.MobileBreadcrumbInbox')}
                        </Typography>
                    </Breadcrumbs>
                    <div className={classes.mobileHeaderMain}>
                        <div>{t('mi-maintenance.MobileTabInbox')}</div>
                        <div className={classes.mobileHeaderIcons}>
                            <IfpIconButton
                                className={clsx(classes.iconSize, classes.iconPaddingRight)}
                                onClick={() => {
                                    setIsOpenSearchBar(true);
                                }}
                            >
                                <AdvIcons.BtnMobileBreadcrumbNavigationSearch />
                            </IfpIconButton>
                            {/** todo: filter */}
                            {/* <IfpIconButton className={classes.iconSize} onClick={() => {}}>
                                <AdvIcons.BtnMobileBreadcrumbNavigationFilter />
                            </IfpIconButton> */}
                        </div>
                    </div>
                </div>
            </IfpToolbar>
            <IfpToolbar variant={IfpToolbarVariant.Dense} disableGutters>
                <Tabs
                    variant="fullWidth"
                    centered
                    value={
                        (currentRole === EUserRole.Creator || currentRole === EUserRole.Reviewer) &&
                        inboxTabType === EInboxTabType.New
                            ? EInboxTabType.Doing
                            : inboxTabType
                    }
                    classes={{ root: classes.muiTabsRoot }}
                >
                    {availableTabsBasedOnCurrentRole.map((type) => (
                        <Tab
                            fullWidth
                            key={type}
                            component="div"
                            value={type}
                            label={t(INBOX_TAB_TYPE_TEXT[type as EInboxTabType])}
                            disabled={doing}
                            onClick={handleTabChange(type)}
                            className={classes.tab}
                            {...a11yProps(type)}
                        />
                    ))}
                </Tabs>
            </IfpToolbar>
            {[EInboxTabType.New, EInboxTabType.Doing, EInboxTabType.Done].map((tabType) => (
                <TabPanel value={inboxTabType} index={tabType} key={tabType}>
                    <InboxContent
                        doing={doing}
                        taskRecords={taskRecords}
                        setPage={setPage}
                        page={page}
                        mobileSummaryRefetch={mobileSummaryRefetch}
                        taskRecordsRefetch={taskRecordsRefetch}
                        taskRecordsPagingInfo={taskRecordsPagingInfo}
                    />
                </TabPanel>
            ))}
            <MainFooter
                inboxCount={inboxCount}
                setQueryParamRole={setQueryParamRole}
                setInboxTabType={setInboxTabType}
                generalTabType={EMobileTaskTabType.Inbox}
                setPage={setPage}
            />
            <SearchBar
                setPage={setPage}
                setSearch={setSearch}
                open={isOpenSearchBar}
                setOpen={setIsOpenSearchBar}
            />
        </div>
    );
};

export default memo(InboxPage);
