import React, { MouseEvent, useCallback } from 'react';
import clsx from 'clsx';
import { createStyles, makeStyles, Theme, FormControl, InputAdornment } from '@material-ui/core';
import {
    Toolbar,
    ToolbarVariant,
    MiddleContent,
    Button,
    ButtonVariant,
    spacing,
    palette,
    images,
    AdvSelectVariant,
} from 'common';
import { CalendarView as CalendarCalendarView } from './CalendarPage';
import { CalendarView as AnnualCalendarView } from '../AnnualSurvey/AnnualSurveyScheduleContent';
import FullCalendar from '@fullcalendar/react';
import { DateTime } from 'luxon';
import CalendarDateSelect from './CalendarDateSelect';
import { useTranslation } from 'react-i18next';

export type CalendarViewType = AnnualCalendarView | CalendarCalendarView;

const useStyles = makeStyles(
    (theme: Theme) =>
        createStyles({
            headerToolbarBtns: {
                color: palette.black,
                fontWeight: 'normal',
                fontSize: 16,
            },
            disableBothSidesBorderRadius: {
                borderRadius: 0,
            },
            disableRightSideBorderRadius: {
                borderBottomRightRadius: 0,
                borderTopRightRadius: 0,
            },
            disableLeftSideBorderRadius: {
                borderBottomLeftRadius: 0,
                borderTopLeftRadius: 0,
            },
            selectLabel: {
                fontSize: 16,
            },
            selectInput: {
                marginRight: spacing.spacingL,
            },
            flex: {
                flex: 1,
                flexShrink: 0,
            },
            flexEnd: {
                justifyContent: 'flex-end',
            },
        }),
    { name: 'PortalCalendarToolbar' },
);

interface CalendarToolbarProps {
    disabled: boolean;
    dateString: string;
    selectedDate: Date;
    showYearBtn?: boolean;
    showYearView?: boolean;
    calendarRef: React.RefObject<FullCalendar>;
    setStartAndEndDate: () => void;
    formatCurrentDate: () => void;
    setReactDatePicker: () => void;
    toolbarType: string;
    setStartYearDate?: React.Dispatch<React.SetStateAction<string>>;
    setEndYearDate?: React.Dispatch<React.SetStateAction<string>>;
    setStartDate?: React.Dispatch<React.SetStateAction<string>>;
    setEndDate?: React.Dispatch<React.SetStateAction<string>>;
    setDateString?: React.Dispatch<React.SetStateAction<string>>;
    setYear?: React.Dispatch<React.SetStateAction<number>>;
    setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
    changeCalendarView: (type: CalendarViewType) => (_: MouseEvent<HTMLElement>) => void;
}

const CalendarToolbar = (props: CalendarToolbarProps) => {
    const {
        setSelectedDate,
        setStartAndEndDate,
        formatCurrentDate,
        setReactDatePicker,
        changeCalendarView,
        disabled,
        dateString,
        selectedDate,
        calendarRef,
        toolbarType,
        setDateString,
        setYear,
        setStartYearDate,
        setEndYearDate,
        showYearBtn = false,
        showYearView = false,
        setStartDate,
        setEndDate,
    } = props;
    const getCalendarApi = useCallback(() => calendarRef.current?.getApi(), [calendarRef]);

    const CalendarView = toolbarType === 'calendar' ? CalendarCalendarView : AnnualCalendarView;

    const classes = useStyles();

    const calendarView = getCalendarApi()?.view.type as CalendarViewType;

    const { t, i18n } = useTranslation();

    const handleNextClick = useCallback(() => {
        if (showYearView) {
            setYear?.((prevState) => {
                const newState = prevState + 1;
                setDateString?.(newState.toString());
                setStartYearDate?.(new Date(newState, 0, 1).toISOString());
                setEndYearDate?.(new Date(newState + 1, 0, 1).toISOString());
                setSelectedDate(new Date(newState, 0, 1));
                return newState;
            });
            return;
        }
        getCalendarApi()?.next();
        setStartAndEndDate();
        formatCurrentDate();
        setReactDatePicker();
    }, [
        showYearView,
        getCalendarApi,
        setStartAndEndDate,
        formatCurrentDate,
        setReactDatePicker,
        setYear,
        setDateString,
        setStartYearDate,
        setEndYearDate,
        setSelectedDate,
    ]);

    const handlePrevClick = useCallback(() => {
        if (showYearView) {
            setYear?.((prevState) => {
                const newState = prevState - 1;
                setDateString?.(newState.toString());
                setStartYearDate?.(new Date(newState, 0, 1).toISOString());
                setEndYearDate?.(new Date(newState + 1, 0, 1).toISOString());
                setSelectedDate(new Date(newState, 0, 1));
                return newState;
            });
            return;
        }
        getCalendarApi()?.prev();
        setStartAndEndDate();
        formatCurrentDate();
        setReactDatePicker();
    }, [
        showYearView,
        getCalendarApi,
        setStartAndEndDate,
        formatCurrentDate,
        setReactDatePicker,
        setYear,
        setDateString,
        setStartYearDate,
        setEndYearDate,
        setSelectedDate,
    ]);

    const handleTodayClick = useCallback(() => {
        if (showYearView) {
            setYear?.((_) => {
                const newState = new Date().getFullYear();
                setDateString?.(newState.toString());
                setStartYearDate?.(new Date(newState, 0, 1).toISOString());
                setEndYearDate?.(new Date(newState + 1, 0, 1).toISOString());
                setSelectedDate(
                    new Date(
                        DateTime.fromISO(
                            new Date(
                                newState,
                                new Date().getMonth(),
                                new Date().getDate(),
                            ).toISOString(),
                        )
                            .startOf('day')
                            .toISO(),
                    ),
                );
                setStartDate?.(
                    DateTime.fromISO(
                        new Date(
                            newState,
                            new Date().getMonth(),
                            new Date().getDate(),
                        ).toISOString(),
                    )
                        .startOf('day')
                        .toISO(),
                );
                setEndDate?.(
                    DateTime.fromISO(
                        new Date(
                            newState,
                            new Date().getMonth(),
                            new Date().getDate(),
                        ).toISOString(),
                    )
                        .startOf('day')
                        .plus({ days: 1 })
                        .minus({ minutes: 1 })
                        .toISO(),
                );
                return newState;
            });
            return;
        }
        getCalendarApi()?.today();
        setStartAndEndDate();
        formatCurrentDate();
        setReactDatePicker();
    }, [
        showYearView,
        getCalendarApi,
        setStartAndEndDate,
        formatCurrentDate,
        setReactDatePicker,
        setYear,
        setDateString,
        setStartYearDate,
        setEndYearDate,
        setSelectedDate,
        setStartDate,
        setEndDate,
    ]);

    let IFPLang = i18n.language;

    return (
        <Toolbar variant={ToolbarVariant.Dense}>
            <MiddleContent className={classes.flex}>
                <Button
                    variant={ButtonVariant.FilledGray}
                    disabled={disabled}
                    onClick={handleTodayClick}
                    className={classes.headerToolbarBtns}
                    active={
                        new Date(DateTime.now().startOf('day').toISO()).toISOString() ===
                        new Date(
                            DateTime.fromISO(new Date(selectedDate).toISOString())
                                .startOf('day')
                                .toISO(),
                        ).toISOString()
                    }
                >
                    {t('mi-maintenance.today')}
                </Button>
            </MiddleContent>
            <Button
                variant={ButtonVariant.TextGrayNoEffects}
                disabled={disabled}
                onClick={handlePrevClick}
                className={classes.headerToolbarBtns}
            >
                <images.BtnMainPagePreviousN />
            </Button>
            <InputAdornment position="start">
                <FormControl hiddenLabel>
                    <CalendarDateSelect
                        IFPLang={IFPLang ?? 'en-US'}
                        setDateString={setDateString}
                        setStartYearDate={setStartYearDate}
                        setEndYearDate={setEndYearDate}
                        setYear={setYear}
                        showYearView={showYearView}
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        calendarRef={calendarRef}
                        calendarView={calendarView}
                        toolbarType={toolbarType}
                        dateString={dateString}
                        variant={AdvSelectVariant.GrayLight}
                        setStartAndEndDate={setStartAndEndDate}
                    />
                </FormControl>
            </InputAdornment>
            <Button
                variant={ButtonVariant.TextGrayNoEffects}
                disabled={disabled}
                onClick={handleNextClick}
                className={classes.headerToolbarBtns}
            >
                <images.BtnMainPageNextN />
            </Button>
            <MiddleContent className={clsx(classes.flex, classes.flexEnd)}>
                <Button
                    variant={ButtonVariant.FilledGray}
                    disabled={disabled}
                    className={clsx(
                        classes.headerToolbarBtns,
                        classes.disableRightSideBorderRadius,
                    )}
                    active={calendarView === CalendarView.Day && !showYearView}
                    onClick={changeCalendarView(CalendarView.Day)}
                >
                    {t('mi-maintenance.day')}
                </Button>
                <Button
                    variant={ButtonVariant.FilledGray}
                    disabled={disabled}
                    className={clsx(
                        classes.headerToolbarBtns,
                        classes.disableBothSidesBorderRadius,
                    )}
                    onClick={changeCalendarView(CalendarView.Week)}
                    active={calendarView === CalendarView.Week && !showYearView}
                >
                    {t('mi-maintenance.week')}
                </Button>
                <Button
                    variant={ButtonVariant.FilledGray}
                    disabled={disabled}
                    className={clsx(
                        classes.headerToolbarBtns,
                        classes.disableLeftSideBorderRadius,
                        { [classes.disableRightSideBorderRadius]: showYearBtn },
                    )}
                    active={calendarView === CalendarView.Month && !showYearView}
                    onClick={changeCalendarView(CalendarView.Month)}
                >
                    {t('mi-maintenance.month')}
                </Button>
                {showYearBtn && (
                    <Button
                        variant={ButtonVariant.FilledGray}
                        disabled={disabled}
                        className={clsx(
                            classes.headerToolbarBtns,
                            classes.disableLeftSideBorderRadius,
                        )}
                        active={showYearView}
                        onClick={changeCalendarView(CalendarCalendarView.Year)}
                    >
                        {t('mi-maintenance.year')}
                    </Button>
                )}
            </MiddleContent>
        </Toolbar>
    );
};

export default CalendarToolbar;
