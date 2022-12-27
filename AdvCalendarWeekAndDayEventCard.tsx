import { createStyles, alpha, makeStyles, Theme } from '@material-ui/core';
import clsx from 'clsx';
import React, { memo, MouseEventHandler, ReactNode } from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import { palette, spacing } from '../styles';
import { icons } from 'common';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';
import { ETaskCategory } from 'graphqlApi';

export enum EStatusColor {
    Red = 'red',
    Yellow = 'yellow',
    Green = 'green',
    Blue = 'blue',
    Orange = 'orange',
    Gray = 'gray',
    Cyan = 'cyan',
}

export enum TaskStatusFullNameMapping {
    Regular = 'Regularly Schedule',
    Daily = 'Daily Check',
    Annual = 'Annual Survey',
    Repair = 'Repair',
}

export type TaskStatusFullNameMappingString = keyof typeof TaskStatusFullNameMapping;

function createColorStyles({
    borderColor,
    captionBg,
    textBg,
}: {
    borderColor?: string;
    captionBg?: string;
    textBg?: string;
}) {
    return createStyles({
        '& $caption, & $text': {
            borderColor,
        },
        '& $caption': {
            background: captionBg,
        },
        '& $text': {
            background: borderColor,
        },
        '&&$root, &&$root:hover': {
            background: borderColor,
            border: '1px solid' + textBg,
            borderLeft: '3px solid' + textBg,
        },
        '& $textWithColor': {
            color: textBg,
        },
    });
}

export const useStyles = makeStyles(
    (theme: Theme) =>
        createStyles({
            root: {
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                boxShadow: `0 2px 4px 0 ${alpha(palette.grayBase, 0.5)}`,
                '& $caption, & $text': {
                    padding: `0px ${spacing.spacingS} 2px ${spacing.spacingS}`,
                },

                '&&:active, &&$active': {
                    boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.5)',
                },
            },
            caption: {
                fontSize: '16px',
                fontWeight: 'bold',
                fontStyle: 'normal',
                letterSpacing: 'normal',
                color: palette.black,
            },
            text: {
                fontSize: '12px',
                fontWeight: 'normal',
                fontStyle: 'normal',
                padding: '4px 8px 4px',
                letterSpacing: 'normal',
                color: palette.grayDarker,
            },
            textWithColor: {
                fontSize: '12px',
                fontWeight: 'bold',
                fontStyle: 'normal',
                padding: '0px 8px',
                letterSpacing: 'normal',
                display: 'flex',
                alignItems: 'center',
            },
            status: {
                marginLeft: '0.2rem',
            },
            dateRange: {
                fontSize: '12px',
                fontWeight: 'bold',
                fontStretch: 'normal',
                fontStyle: 'normal',
                letterSpacing: 'normal',
                padding: '0 8px',
            },
            overdueIcon: {
                borderRadius: '4px',
                padding: '0 4px',
                color: palette.white,
                backgroundColor: palette.redBase,
                marginLeft: '4px',
            },
            overdueText: {
                color: palette.redBase,
            },
            cancelled: {
                textDecoration: 'line-through',
                color: palette.grayDarker,
            },
            active: {},
            [EStatusColor.Red]: {
                ...createColorStyles({
                    borderColor: palette.redLightest,
                    captionBg: palette.redLightest,
                    textBg: palette.redBase,
                }),
            },
            [EStatusColor.Yellow]: {
                ...createColorStyles({
                    borderColor: palette.yellowLightest,
                    captionBg: palette.yellowLightest,
                    textBg: palette.yellowBase,
                }),
            },
            [EStatusColor.Green]: {
                ...createColorStyles({
                    borderColor: palette.greenLightest,
                    captionBg: palette.greenLightest,
                    textBg: palette.greenBase,
                }),
            },
            [EStatusColor.Blue]: {
                ...createColorStyles({
                    borderColor: palette.blueLightest,
                    captionBg: palette.blueLightest,
                    textBg: palette.blueBase,
                }),
            },
            [EStatusColor.Orange]: {
                ...createColorStyles({
                    borderColor: palette.orangeLightest,
                    captionBg: palette.orangeLightest,
                    textBg: palette.orangeBase,
                }),
            },
            [EStatusColor.Gray]: {
                ...createColorStyles({
                    borderColor: palette.grayLight,
                    captionBg: palette.grayLight,
                    textBg: palette.grayDarker,
                }),
            },
            [EStatusColor.Cyan]: {
                ...createColorStyles({
                    borderColor: palette.cyanLight,
                    captionBg: palette.cyanLight,
                    textBg: palette.cyanDarker,
                }),
            },
        }),
    { name: 'AdvCalendarWeekAndDayEventCard' },
);

interface AdvCalendarWeekDayCardProps {
    status?: string;
    machineName?: string;
    children?: ReactNode;
    className?: string;
    color?: EStatusColor;
    title: TaskStatusFullNameMappingString;
    active?: boolean;
    onClick?: MouseEventHandler;
    reviewStatus?: any;
    isOverdue?: boolean;
    startDate?: Date | null;
    endDate?: Date | null;
}

export const parseCaptionToFullName = (title: TaskStatusFullNameMappingString) => {
    return TaskStatusFullNameMapping[title];
};

export const renderIconColor = (color: string) => {
    switch (color) {
        case EStatusColor.Blue:
            return <icons.TaskRecordStatusIcons.ImgMainLabelBlue />;
        case EStatusColor.Orange:
            return <icons.TaskRecordStatusIcons.ImgMainLabelOrange />;
        case EStatusColor.Yellow:
            return <icons.TaskRecordStatusIcons.ImgMainLabelYellow />;
        case EStatusColor.Green:
            return <icons.TaskRecordStatusIcons.ImgMainLabelGreen />;
        case EStatusColor.Red:
            return <icons.TaskRecordStatusIcons.ImgMainLabelRed />;
        case EStatusColor.Gray:
            return <icons.TaskRecordStatusIcons.ImgMainLabelGray />;
        default:
            break;
    }
};
function AdvCalendarWeekAndDayEventCard(props: AdvCalendarWeekDayCardProps) {
    const {
        className: classNameProp,
        color = EStatusColor.Blue,
        title,
        status,
        active,
        machineName,
        onClick,
        reviewStatus,
        isOverdue,
        startDate,
        endDate,
    } = props;
    const { t, i18n } = useTranslation();

    // const { totalReviewCheckItemsCount, passedReviewCheckItemsCount } = reviewStatus;

    const classes = useStyles();
    const className = clsx(
        classes.root,
        classes[color],
        {
            [classes.active]: active,
        },
        classNameProp,
    );
    let IFPLang = i18n.language;

    return (
        <Card onClick={onClick} className={className}>
            <CardContent
                className={clsx(classes.caption, {
                    [classes.cancelled]: EStatusColor.Gray === color,
                })}
            >
                {title !== ETaskCategory.Repair
                    ? t('mi-maintenance.Maintenance')
                    : t('mi-maintenance.Repair')}
            </CardContent>
            <CardContent className={clsx(classes.dateRange, { [classes.overdueText]: isOverdue })}>
                {DateTime.fromISO(startDate?.toString() ?? '')
                    .setLocale(IFPLang ?? 'en-US')
                    .toFormat('t') +
                    ' ~ ' +
                    DateTime.fromISO(endDate?.toString() ?? '')
                        .setLocale(IFPLang ?? 'en-US')
                        .toFormat('t')}

                {isOverdue && (
                    <span className={classes.overdueIcon}>{t('mi-maintenance.overdue')}</span>
                )}
            </CardContent>
            <CardContent className={classes.textWithColor}>
                {renderIconColor(color)}
                <span className={classes.status}>
                    {status === 'In Review'
                        ? t(`mi-maintenance.${status.replace(/\s+/g, '')}`) + reviewStatus
                        : t(`mi-maintenance.${status?.replace(/\s+/g, '')}`)}
                </span>
            </CardContent>
            <CardContent className={classes.text}>{machineName}</CardContent>
        </Card>
    );
}

export default memo(AdvCalendarWeekAndDayEventCard);
