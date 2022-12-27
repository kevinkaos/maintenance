import { useState, useRef, useMemo, useCallback, useEffect, MouseEvent } from 'react';
import FullCalendar, { EventApi, EventContentArg, EventInput } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import luxonPlugin from '@fullcalendar/luxon';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import {
    ETaskStatus,
    ETaskCheckItemStatus,
    useTaskRecordsPortalValidActionsQuery,
    Maybe,
    ETaskValidAction,
    useTaskRecordsStatusSummaryByDateQuery,
} from 'graphqlApi';
import { DateTime, Duration } from 'luxon';
import { createStyles, makeStyles, Theme, Typography } from '@material-ui/core';
import {
    FitRelative,
    ScrollableContent,
    AdvCalendarWeekAndDayEventCard,
    EStatusColor,
    TaskStatusFullNameMappingString,
    AdvCalendarMonthCard,
    palette,
} from 'common';
import { MODAL_TYPES, useGlobalModalContext } from 'helpers/context/GlobalModal';
import { isEnumValue } from 'common/utils';
import CalendarPopover from './CalendarPopover';
import CalendarToolbar from './CalendarToolbar';
import { CalendarViewType } from './CalendarToolbar';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { getErrorContent } from 'helpers/utils';
const Calendar = require('rc-year-calendar');
require('rc-year-calendar/locales/rc-year-calendar.zh-TW');
require('rc-year-calendar/locales/rc-year-calendar.zh-CN');

const useStyles = makeStyles(
    (theme: Theme) =>
        createStyles({
            root: {
                width: '100%',
                height: '100%',
                minWidth: '700px',
                display: 'flex',
                flexDirection: 'column',
            },
            calendarWrapper: {
                position: 'relative',
                flexGrow: 1,
                flexShrink: 0,
            },
            calendar: {
                minHeight: '400px',
            },
            displayNone: {
                display: 'none',
                height: 0,
                width: 0,
            },
            yearView: {
                maxWidth: '75%',
                '& .calendar .calendar-header': {
                    display: 'none',
                },
                '& .calendar': {
                    height: '66vh',
                },
            },
            flex: {
                display: 'flex',
            },
            flexColumn: {
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '66vh',
                overflow: 'scroll',
                marginLeft: 'auto',
                width: '25%',
            },
            minHeightCard: {
                minHeight: '6rem',
                maxHeight: '7rem',
            },
            eventsPadding: {
                padding: '1rem',
            },
        }),
    { name: 'PortalCalendarPage' },
);

export enum CalendarView {
    Day = 'timeGridDay',
    Week = 'timeGridWeek',
    Month = 'dayGridMonth',
    Year = 'year',
}

export enum ActionMapping {
    Progress = 'Accept',
    Reassign = 'Reject',
    Withdraw = 'Withdraw',
    Finish = 'Finish',
    SendNotice = 'Send Notice',
    Pass = 'Pass',
    Fail = 'Fail',
    Cancel = 'Cancel',
    Assign = 'Reassign',
    Remove = 'Remove',
}

const MaxTaskRecordsInCalendarDateRange = 999;

function CalendarPage() {
    const classes = useStyles();
    const { t, i18n } = useTranslation();
    let IFPLang = i18n.language;
    const calendarRef = useRef<FullCalendar>(null);
    const getCalendarApi = useCallback(() => calendarRef.current?.getApi(), [calendarRef]);
    const dt = DateTime.local();
    // const [querySkip, setQuerySkip] = useState<boolean>(true);

    // minus 1 day, because Luxon starts week at Monday instead of Sunday
    const startOfCurrentWeek = getCalendarApi()
        ? new Date(getCalendarApi()?.view.currentStart ?? new Date()).toISOString()
        : new Date(dt.startOf('week').minus({ days: 1 }).toISO()).toISOString();

    const endOfCurrentWeek = getCalendarApi()
        ? new Date(getCalendarApi()?.view.currentEnd ?? new Date()).toISOString()
        : new Date(dt.endOf('week').minus({ days: 1 }).toISO()).toISOString();
    const [startDate, setStartDate] = useState(startOfCurrentWeek);
    const [endDate, setEndDate] = useState(endOfCurrentWeek);
    const [startYearDate, setStartYearDate] = useState(
        new Date(new Date().getFullYear(), 0, 1).toISOString(),
    );
    const [endYearDate, setEndYearDate] = useState(
        new Date(new Date().getFullYear() + 1, 0, 1).toISOString(),
    );

    const [dateString, setDateString] = useState<string>(
        `${DateTime.fromISO(startDate).toFormat(
            `MMM dd'-'${DateTime.fromISO(endDate).minus({ days: 1 }).toFormat('dd')}', 'y`,
        )}`,
    );
    const [selectedDate, setSelectedDate] = useState(new Date(startDate));
    const [selectedEvent, setSelectedEvent] = useState<EventApi>();
    const [selectedEventAnchorEl, setSelectedEventAnchorEl] = useState<HTMLElement>();
    const [, setCalendarView] = useState<CalendarViewType>(CalendarView.Week);
    const [showYearView, setShowYearView] = useState<boolean>(false);
    const [year, setYear] = useState(new Date().getFullYear());
    const calendarView = getCalendarApi()?.view.type as CalendarView;
    const { showModal } = useGlobalModalContext();
    const {
        data: statusSummaryByDateData,
        loading: statusSummaryByDateLoading,
        refetch: statusSummaryByDateRefetch,
        error: statusSummaryByDateError,
    } = useTaskRecordsStatusSummaryByDateQuery({
        variables: {
            filterInput: {
                dateRange: {
                    startDate: startYearDate,
                    endDate: endYearDate,
                },
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
        },
        skip: showYearView === false ? true : false,
        errorPolicy: 'all',
    });

    useEffect(() => {
        if (statusSummaryByDateError) {
            showModal(MODAL_TYPES.DANGER_MODAL, {
                show: true,
                title: t(`mi-maintenance.GetSummaryError`),
                content: getErrorContent(statusSummaryByDateError).map((errorReason: string) =>
                    t(`mi-maintenance.${errorReason}`),
                ),
                closeText: t('mi-maintenance.DialogClose'),
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(statusSummaryByDateError, null, 2)]);

    const {
        data: taskRecordsData,
        loading: taskRecordsLoading,
        refetch: taskRecordsRefetch,
        error: taskRecordsError,
    } = useTaskRecordsPortalValidActionsQuery({
        variables: {
            pagingInput: { page: 1, pageSize: MaxTaskRecordsInCalendarDateRange },
            filterInput: {
                dateRange: {
                    startDate,
                    endDate,
                },
            },
        },
        skip: !getCalendarApi(),
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
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

    // Check to see if difference between start and end date qualifies as all day event
    const checkIsAllDayEvent = (start: any, end: any): boolean => {
        const allDayDuration = Duration.fromObject({ hours: 23, minutes: 59 }).as('minutes');
        const endLux = DateTime.fromISO(end);
        const startLux = DateTime.fromISO(start);
        const diffInMins = endLux.diff(startLux, 'minutes');
        return diffInMins.as('minutes') >= allDayDuration;
    };

    // Check to see if task record is overdue
    const getIsOverdue = useCallback((endDate: Maybe<string | undefined>, status: ETaskStatus) => {
        const timeNow = new Date().getTime();

        if (status === ETaskStatus.Completed || status === ETaskStatus.Cancelled) return false;

        return timeNow > new Date(endDate ?? timeNow).getTime();
    }, []);

    // Calculate total reviewers PASSED
    const getPassedReviewersCount = useCallback((taskRecord: any) => {
        if (taskRecord.status === ETaskStatus.InReview) {
            const totalReviewers = taskRecord.reviewerUsers?.length || 0;
            let passedReviews = 0;
            let passedReviewers = 0;
            taskRecord.checkItems?.forEach((checkItem: any) => {
                if (
                    checkItem.status === ETaskCheckItemStatus.Done &&
                    !!checkItem.reviewerUsers.find((x: any) => x.action === ETaskValidAction.Pass)
                ) {
                    passedReviews++;
                } else if (checkItem.status === ETaskCheckItemStatus.Pass) {
                    passedReviewers = totalReviewers;
                }
            });

            if (passedReviews === taskRecord.checkItems.length) {
                passedReviewers++;
            }

            return ` ${passedReviewers}/${totalReviewers}`;
        }
    }, []);

    const taskRecords = taskRecordsData?.taskRecords?.results;

    const yearEvents = useMemo(() => {
        if (!statusSummaryByDateData?.taskRecords?.statusSummaryByDate) return;
        const dates = Object.keys(statusSummaryByDateData.taskRecords.statusSummaryByDate)?.map(
            (date) => DateTime.fromFormat(date, 'yyyyLLdd').toJSDate(),
        );
        const yearEvents = dates.map((date: any, index: number) => {
            return {
                id: index,
                name: date,
                startDate: date,
                endDate: date,
                color: palette.purpleLight,
            };
        });
        yearEvents.push({
            id: dates.length + 999,
            name: 'today',
            startDate: new Date(),
            endDate: new Date(),
            color: palette.blueLight,
        });
        return yearEvents;
    }, [statusSummaryByDateData?.taskRecords?.statusSummaryByDate]);

    const events = useMemo(
        () =>
            taskRecords?.map((taskRecord) => {
                const status = taskRecord.status.replace(/([A-Z])/g, ' $1').trim();

                const maintainerUsers = taskRecord.checkItems?.map((checkItem: any) => {
                    return checkItem.taskCheckItem.maintainerUser.name;
                });

                const uniqueMaintainerUsers = [...Array.from(new Set(maintainerUsers))];

                return {
                    id: taskRecord.id,
                    title: taskRecord.category,
                    extendedProps: {
                        maintainerUsers: uniqueMaintainerUsers,
                        reviewerUsers: taskRecord.reviewerUsers,
                        taskNo: taskRecord.taskNo,
                        isOverdue: getIsOverdue(taskRecord.dateRange?.endDate, taskRecord.status),
                        validActions: taskRecord.validActions,
                        dateRange: taskRecord.dateRange,
                        status,
                        reviewStatus: getPassedReviewersCount(taskRecord),
                        machine: taskRecord.machine,
                        color:
                            taskRecord.status === ETaskStatus.Assigned
                                ? EStatusColor.Yellow
                                : taskRecord.status === ETaskStatus.Completed
                                ? EStatusColor.Green
                                : taskRecord.status === ETaskStatus.InReview
                                ? EStatusColor.Blue
                                : taskRecord.status === ETaskStatus.Cancelled
                                ? EStatusColor.Gray
                                : EStatusColor.Orange,
                    },
                    start: taskRecord.dateRange?.startDate,
                    end: taskRecord.dateRange?.endDate,
                    allDay: checkIsAllDayEvent(
                        taskRecord.dateRange?.startDate,
                        taskRecord.dateRange?.endDate,
                    ),
                } as EventInput;
            }),
        [getIsOverdue, getPassedReviewersCount, taskRecords],
    );

    const disabled = taskRecordsLoading || statusSummaryByDateLoading;

    function determineEventMaxStack() {
        if (!getCalendarApi()) return;
        if (getCalendarApi()?.view.type === CalendarView.Day) return 6;
        else if (getCalendarApi()?.view.type === CalendarView.Week) return 2;
        else return 4;
    }

    function handleEventClick(eventApi: EventApi) {
        return (event: MouseEvent<HTMLElement>) => {
            setSelectedEvent(eventApi);
            setSelectedEventAnchorEl(event.currentTarget);
        };
    }

    function handleEventPopoverClose() {
        setSelectedEvent(void 0);
        setSelectedEventAnchorEl(void 0);
    }

    const setStartAndEndDate = useCallback(() => {
        if (!getCalendarApi()) return;
        setStartDate(new Date(getCalendarApi()?.view.currentStart ?? new Date()).toISOString());
        setEndDate(new Date(getCalendarApi()?.view.currentEnd ?? new Date()).toISOString());
    }, [getCalendarApi]);

    const setReactDatePicker = useCallback(() => {
        if (!getCalendarApi()) return;
        return setSelectedDate(getCalendarApi()?.getDate() ?? new Date());
    }, [getCalendarApi]);

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

        switch (calendarView) {
            case CalendarView.Day:
                return setDateString(dayString);
            case CalendarView.Week:
                return setDateString(weekString);

            case CalendarView.Month:
                return setDateString(monthString);
            default:
                return;
        }
    }, [IFPLang, calendarView, endDate, startDate]);

    const changeCalendarView = (type: CalendarViewType | string) => {
        return (_: MouseEvent<HTMLElement>) => {
            if (!getCalendarApi()) return;
            if (type !== 'year') {
                setShowYearView(false);
                getCalendarApi()?.changeView(type);
                setCalendarView(type as CalendarViewType);
                setStartAndEndDate();
                setReactDatePicker();
                formatCurrentDate();
            } else {
                setStartYearDate(new Date(new Date().getFullYear(), 0, 1).toISOString());
                setEndYearDate(new Date(new Date().getFullYear() + 1, 0, 1).toISOString());
                setSelectedDate(dt.startOf('day').toJSDate());
                setDateString(new Date().getFullYear().toString());
                setShowYearView(true);
                setStartDate(dt.startOf('day').toISO());
                setEndDate(dt.startOf('day').plus({ days: 1 }).minus({ minutes: 1 }).toISO());
            }
        };
    };

    function renderEventContent({ event }: EventContentArg) {
        const {
            color,
            machine: { name: machineName },
            status,
            reviewStatus,
            isOverdue,
            dateRange,
        } = event.extendedProps;

        const { startDate, endDate } = dateRange;

        return calendarView === CalendarView.Month ? (
            <AdvCalendarMonthCard
                title={event.title as TaskStatusFullNameMappingString}
                color={isEnumValue(color, EStatusColor) ? color : void 0}
                active={selectedEvent?.id === event.id}
                onClick={handleEventClick(event)}
                machineName={machineName}
                status={status}
                isOverdue={isOverdue}
                reviewStatus={reviewStatus}
                endDate={endDate}
                startDate={startDate}
            />
        ) : (
            <AdvCalendarWeekAndDayEventCard
                title={event.title as TaskStatusFullNameMappingString}
                color={isEnumValue(color, EStatusColor) ? color : void 0}
                active={selectedEvent?.id === event.id}
                onClick={handleEventClick(event)}
                machineName={machineName}
                status={status}
                isOverdue={isOverdue}
                reviewStatus={reviewStatus}
                endDate={endDate}
                startDate={startDate}
            />
        );
    }

    function onMoreLinkClick(info: any) {
        if (calendarView === CalendarView.Month && getCalendarApi()) {
            setCalendarView(CalendarView.Day);
            setReactDatePicker();
            formatCurrentDate();
            getCalendarApi()?.gotoDate(info.date);
            getCalendarApi()?.changeView(CalendarView.Day);
            setStartAndEndDate();
            return;
        }
        return 'popover';
    }

    function renderDayEvents(e: any) {
        setSelectedDate(e.date);
        setStartDate(new Date(e.date).toISOString());
        setEndDate(DateTime.fromJSDate(e.date).plus({ days: 1 }).minus({ minutes: 1 }).toISO());
    }

    useEffect(() => {
        if (showYearView) return;
        setStartAndEndDate();
        formatCurrentDate();
        setReactDatePicker();
    }, [formatCurrentDate, setReactDatePicker, setStartAndEndDate, showYearView]);

    useEffect(() => {
        if (!showYearView) return;
        statusSummaryByDateRefetch();
    }, [statusSummaryByDateRefetch, year, showYearView]);

    // useEffect(() => {
    //     if (!!!getCalendarApi()) return;
    //     setQuerySkip(false);
    // }, [getCalendarApi]);

    useEffect(() => {
        taskRecordsRefetch();
    }, [taskRecordsRefetch, showYearView]);

    return (
        <div className={classes.root}>
            <CalendarToolbar
                showYearBtn
                setStartDate={setStartDate}
                setEndDate={setEndDate}
                setStartYearDate={setStartYearDate}
                setEndYearDate={setEndYearDate}
                setYear={setYear}
                showYearView={showYearView}
                setDateString={setDateString}
                calendarRef={calendarRef}
                dateString={dateString}
                disabled={disabled}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                setReactDatePicker={setReactDatePicker}
                setStartAndEndDate={setStartAndEndDate}
                changeCalendarView={changeCalendarView}
                toolbarType={'calendar'}
                formatCurrentDate={formatCurrentDate}
            />
            <div className={clsx(classes.calendarWrapper, { [classes.displayNone]: showYearView })}>
                <FitRelative>
                    <ScrollableContent hideScrollbar>
                        <FullCalendar
                            ref={calendarRef}
                            schedulerLicenseKey={process.env.REACT_APP_FULL_CALENDAR_LICENSE_KEY}
                            plugins={[
                                dayGridPlugin,
                                timeGridPlugin,
                                interactionPlugin,
                                luxonPlugin,
                                resourceTimelinePlugin,
                            ]}
                            contentHeight={'auto'}
                            locale={
                                IFPLang?.toLowerCase() === 'en-us' ? 'en' : IFPLang?.toLowerCase()
                            }
                            moreLinkClick={onMoreLinkClick}
                            scrollTime="00:00:00"
                            viewClassNames={[
                                'holiday-calendar',
                                clsx(classes.calendar, { [classes.displayNone]: showYearView }),
                            ]}
                            showNonCurrentDates={false}
                            titleFormat="LLLL d, yyyy"
                            headerToolbar={false}
                            initialView="timeGridWeek"
                            eventColor="transparent"
                            eventBackgroundColor="transparent"
                            eventBorderColor="transparent"
                            dayMaxEvents={2}
                            eventMaxStack={determineEventMaxStack()}
                            weekends={true}
                            events={events}
                            eventContent={renderEventContent}
                        />

                        {selectedEvent && (
                            <CalendarPopover
                                event={selectedEvent}
                                selectedEventAnchorEl={selectedEventAnchorEl}
                                handleEventPopoverClose={handleEventPopoverClose}
                            />
                        )}
                    </ScrollableContent>
                </FitRelative>
            </div>
            {showYearView && (
                <div className={classes.flex}>
                    <div className={classes.yearView}>
                        <Calendar
                            allowOverlap={true}
                            year={year}
                            language={IFPLang ?? 'en-US'}
                            // eslint-disable-next-line react/style-prop-object
                            style="border"
                            dataSource={yearEvents}
                            onDayClick={renderDayEvents}
                        />
                    </div>
                    <div className={clsx(classes.flexColumn, classes.eventsPadding)}>
                        <Typography
                            variant="h5"
                            className={classes.eventsPadding}
                        >{`${DateTime.fromISO(startDate).toFormat('yyyy/LL/dd')} ${t(
                            `mi-maintenance.schedule`,
                        )}`}</Typography>
                        {events?.map((event: any) => {
                            const {
                                color,
                                machine: { name: machineName },
                                status,
                                reviewStatus,
                                isOverdue,
                                dateRange,
                            } = event.extendedProps;

                            const { id } = event;

                            const { startDate, endDate } = dateRange;
                            return (
                                <AdvCalendarWeekAndDayEventCard
                                    key={id}
                                    className={classes.minHeightCard}
                                    title={event.title as TaskStatusFullNameMappingString}
                                    color={isEnumValue(color, EStatusColor) ? color : void 0}
                                    active={selectedEvent?.id === event.id}
                                    onClick={handleEventClick(event)}
                                    machineName={machineName}
                                    status={status}
                                    isOverdue={isOverdue}
                                    reviewStatus={reviewStatus}
                                    endDate={endDate}
                                    startDate={startDate}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CalendarPage;
