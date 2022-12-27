import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
    IfpToolbar,
    BreadcrumbLink,
    palette,
    IfpIconButton,
    IfpToolbarVariant,
    withStringEnumParam,
    IfpButton,
} from '@advifactory/ifp-ui-core';
import { Breadcrumbs, createStyles, makeStyles, Theme, Typography } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { MainFooter, MonthSelector, QueryParam, routePaths } from '../..';
import MainHeader from '../../Layout/MainHeader';
import { AdvIcons } from 'components';
import clsx from 'clsx';
import { useQueryParam, withDefault } from 'use-query-params';
import { EMobileTaskTabType } from 'genres/mobile-layout';
import CalendarContent from './CalendarContent';
import SearchBar from '../../dialogs/SearchBar';
import { EUserRole } from 'genres';
import { useCurrentRole } from 'common/components/MobileGlobalState';
import {
    ERole,
    ESortOrder,
    ETaskCategory,
    ETaskStatus,
    useTaskRecordsMobileQuery,
    useTaskRecordsMobileSummaryLazyQuery,
} from 'graphqlApi';
import { useUser } from 'contexts/UserHooks';
import { DateTypeSelector } from '../../dialogs';
import { EMobileCalendarType } from 'views/Mobile/SharePages/AdvMobileCalendarHeader';
import WeekSelector from '../../WeekSelector';
import { DateTime } from 'luxon';
import RepairRequestFormDialog from '../../dialogs/RepairRequestFormDialog';
import { images } from 'common';
import { MODAL_TYPES, useGlobalModalContext } from 'helpers/context/GlobalModal';
import { getErrorContent } from 'helpers/utils';

const useStyles = makeStyles(
    (theme: Theme) =>
        createStyles({
            mobileBreadcrumbFontSize: {
                fontSize: '12px',
            },
            mobileBreadCrumbBgColor: {
                backgroundColor: palette.grayLight,
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
            flex: {
                display: 'flex',
            },
            requestFormBtn: {
                borderRadius: '50%',
                width: '56px',
                height: '56px',
                position: 'absolute',
                bottom: '66px',
                right: '12px',
                padding: '4px',
                boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.5)',
                backgroundImage: `linear-gradient(315deg, ${palette.purpleBase}, ${palette.blueBase})`,
            },
            mt2: {
                marginTop: '2px',
            },
        }),
    { name: 'CalendarPage' },
);

const CalendarPage = () => {
    const { t, i18n } = useTranslation();
    let IFPLang = i18n.language;
    const classes = useStyles();
    const { currentRole } = useCurrentRole();
    const user = useUser();
    const initialUserRole = user.roles?.length ? user.roles[0] : EUserRole.None;
    const [isOpenDateTypeSelector, setIsOpenDateTypeSelector] = useState<boolean>(false);
    const [isOpenRequestForm, setIsOpenRequestForm] = useState<boolean>(false);
    const { showModal } = useGlobalModalContext();
    // query params
    const [queryParamRole, setQueryParamRole] = useQueryParam(
        QueryParam.Role,
        withDefault(
            withStringEnumParam(EUserRole),
            currentRole === EUserRole.None ? initialUserRole : (currentRole as EUserRole),
        ),
    );
    const [currentDateType, setCurrentDateType] = useQueryParam(
        QueryParam.DateType,
        withDefault(withStringEnumParam(EMobileCalendarType), EMobileCalendarType.Week),
    );

    useEffect(() => {
        // initialize query params
        setQueryParamRole(
            currentRole === EUserRole.None ? initialUserRole : (currentRole as EUserRole),
            'replaceIn',
        );
        setCurrentDateType(EMobileCalendarType.Week, 'replaceIn');
    }, [currentRole, initialUserRole, setCurrentDateType, setQueryParamRole]);

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
    const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
    const [activeSort, setActiveSort] = useState<string | undefined>(void 0);
    const [sortingOrder, setSortingOrder] = useState(ESortOrder.Desc);
    const [search, setSearch] = useState<string>('');
    const [isOpenSearchBar, setIsOpenSearchBar] = useState<boolean>(false);
    // const [dateRange, setDateRange] = useState<{
    //     startDate: Date | undefined;
    //     endDate: Date | undefined;
    // }>({ startDate: void 0, endDate: void 0 });
    const dt = DateTime.local();
    // minus 1 day, because Luxon starts week at Monday instead of Sunday
    const startOfCurrentWeek = new Date(
        dt.startOf('week').minus({ days: 1 }).toISO(),
    ).toISOString();
    const endOfCurrentWeek = new Date(dt.endOf('week').toISO()).toISOString();
    const [startDate, setStartDate] = useState(startOfCurrentWeek);
    const [endDate, setEndDate] = useState(endOfCurrentWeek);
    const [showDate, setShowDate] = useState<Date>(new Date());
    const [targetDate, setTargetDate] = useState<Date>(new Date());
    const [dateString, setDateString] = useState<string>(
        `${DateTime.fromISO(startDate ?? new Date().toISOString()).toFormat(
            `MMM dd'-'${DateTime.fromISO(endDate ?? new Date().toISOString())
                .minus({ days: 1 })
                .toFormat('dd')}', 'y`,
        )}`,
    );
    const isSkipQuery = currentRole === EUserRole.None;

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
                title: t(`mi-maintenance.GetSummaryError`),
                content: getErrorContent(mobileSummaryError).map((errorReason: string) =>
                    t(`mi-maintenance.${errorReason}`),
                ),
                closeText: t('mi-maintenance.DialogClose'),
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(mobileSummaryError, null, 2)]);

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
                categories:
                    queryParamRole === EUserRole.Requester
                        ? [ETaskCategory.Repair]
                        : taskCategories,
                machineIds: selectedMachineIds,
                maintainerUserIds: maintainerUserIds,
                role: currentRole as ERole,
                dateRange: {
                    startDate: targetDate
                        ? DateTime.fromJSDate(targetDate).startOf('day').toJSDate().toISOString()
                        : void 0,
                    endDate: targetDate
                        ? DateTime.fromJSDate(targetDate).endOf('day').toJSDate().toISOString()
                        : void 0,
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

    const formatCurrentDate = useCallback(() => {
        const dayString = `${DateTime.fromISO(startDate)
            .setLocale(IFPLang ?? 'en-US')
            .toLocaleString(DateTime.DATE_MED)}`;

        const weekString = `${DateTime.fromISO(startDate)
            .setLocale(IFPLang ?? 'en-US')
            .toFormat(
                `MMM dd'-'${DateTime.fromISO(endDate).minus({ days: 1 }).toFormat('dd')}', 'y`,
            )}`;

        const monthString = `${DateTime.fromISO(startDate)
            .setLocale(IFPLang ?? 'en-US')
            .toFormat('MMM yyyy')}`;

        switch (currentDateType) {
            case EMobileCalendarType.Day:
                return setDateString(dayString);
            case EMobileCalendarType.Week:
                return setDateString(weekString);

            case EMobileCalendarType.Month:
                return setDateString(monthString);
            default:
                return;
        }
    }, [IFPLang, currentDateType, endDate, startDate]);

    useEffect(() => {
        if (isSkipQuery) return;
        taskRecordMobileSummaryLazyQuery();
    }, [isSkipQuery, taskRecordMobileSummaryLazyQuery]);

    useEffect(() => {
        taskRecordsRefetch();
    }, [taskRecordsRefetch]);

    useEffect(() => {
        formatCurrentDate();
    }, [formatCurrentDate]);

    return (
        <div>
            <MainHeader />
            <IfpToolbar
                variant={IfpToolbarVariant.Large}
                className={clsx(classes.mobileBreadCrumbBgColor, classes.mt2)}
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
                            {t('mi-maintenance.MobileBreadcrumbCalendar')}
                        </Typography>
                    </Breadcrumbs>
                    <div className={classes.mobileHeaderMain}>
                        <div
                            className={classes.flex}
                            onClick={() => setIsOpenDateTypeSelector(true)}
                        >
                            <div>{dateString}</div>
                            <div style={{ paddingTop: '2px' }}>
                                <AdvIcons.BtnMobileDropdownArrowBlack />
                            </div>
                        </div>
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
                            {/* <IfpIconButton
                                className={clsx(classes.iconSize, classes.iconPaddingRight)}
                                onClick={() => {}}
                            >
                                <AdvIcons.BtnMobileBreadcrumbNavigationFilter />
                            </IfpIconButton> */}
                            <IfpIconButton
                                className={classes.iconSize}
                                onClick={() => {
                                    const date = new Date();
                                    setTargetDate(date);
                                    setShowDate(date);
                                    setStartDate(
                                        DateTime.fromJSDate(date)
                                            .startOf('week')
                                            .minus({ days: 1 })
                                            .toJSDate()
                                            .toISOString(),
                                    );
                                    setEndDate(
                                        DateTime.fromJSDate(date)
                                            .endOf('week')
                                            .toJSDate()
                                            .toISOString(),
                                    );
                                }}
                            >
                                <AdvIcons.BtnMobileBreadcrumbNavigationToday />
                            </IfpIconButton>
                        </div>
                    </div>
                </div>
            </IfpToolbar>
            <div className={classes.mobileBreadCrumbBgColor}>
                {currentDateType === EMobileCalendarType.Week && (
                    <WeekSelector
                        showDate={showDate}
                        targetDate={targetDate}
                        setStartDate={setStartDate}
                        setEndDate={setEndDate}
                        changeShowDate={(date) => {
                            setPage(0);
                            setShowDate(date);
                        }}
                        changeTargetDate={(date) => {
                            setPage(0);
                            setTargetDate(date);
                        }}
                    />
                )}
                {currentDateType === EMobileCalendarType.Month && (
                    <MonthSelector
                        showDate={showDate}
                        targetDate={targetDate}
                        startDate={startDate}
                        endDate={endDate}
                        setStartDate={setStartDate}
                        setEndDate={setEndDate}
                        changeShowDate={(date) => {
                            setPage(0);
                            setShowDate(date);
                        }}
                        changeTargetDate={(date) => {
                            setPage(0);
                            setTargetDate(date);
                        }}
                    />
                )}
            </div>
            <CalendarContent
                currentDateType={currentDateType}
                doing={doing}
                setPage={setPage}
                page={page}
                mobileSummaryRefetch={mobileSummaryRefetch}
                taskRecordsRefetch={taskRecordsRefetch}
                taskRecordsPagingInfo={taskRecordsPagingInfo}
                taskRecords={taskRecords}
            />
            <MainFooter
                inboxCount={inboxCount}
                setPage={setPage}
                setQueryParamRole={setQueryParamRole}
                generalTabType={EMobileTaskTabType.Calendar}
            />
            {isOpenDateTypeSelector && (
                <DateTypeSelector
                    currentDateType={currentDateType}
                    onClose={() => setIsOpenDateTypeSelector(false)}
                    onChange={(type: EMobileCalendarType) => {
                        setIsOpenDateTypeSelector(false);
                        setCurrentDateType(type);
                    }}
                />
            )}
            <SearchBar setSearch={setSearch} open={isOpenSearchBar} setOpen={setIsOpenSearchBar} />
            {isOpenRequestForm && (
                <RepairRequestFormDialog open={isOpenRequestForm} setOpen={setIsOpenRequestForm} />
            )}
            {queryParamRole === EUserRole.Requester && (
                <IfpButton
                    disabled={doing}
                    onClick={() => setIsOpenRequestForm(true)}
                    className={classes.requestFormBtn}
                >
                    <images.BtnMobileNavigationNewN />
                </IfpButton>
            )}
        </div>
    );
};

export default memo(CalendarPage);
