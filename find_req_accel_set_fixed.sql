create or replace PROCEDURE FIND_REQ_ACCEL_SET 
(
  PLANT_ID_P IN NUMBER 
, UNIT_ID_P IN NUMBER 
, BUILDING_P IN VARCHAR2 
, ROOM_P IN VARCHAR2 
, LEV1_P IN VARCHAR2 
, LEV2_P IN VARCHAR2 
, EARTHQ_TYPE_P IN VARCHAR2 
, CALC_TYPE_P IN VARCHAR2 
, SET_TYPE_P IN VARCHAR2
, DEMPF_P IN VARCHAR2
, SET_ID_P OUT NUMBER
, FOUND_EK OUT NUMBER 
) AS 
    c_ACCEL_SET SYS_REFCURSOR;
    c_EK SYS_REFCURSOR;
    SELECTION_LINE VARCHAR(1000);
    LEV1_LINE VARCHAR(200);
    LEV2_LINE VARCHAR(200);
    PLANT_LINE VARCHAR(200);
    UNIT_LINE VARCHAR(200);
    BUILDING_LINE VARCHAR(200);
    ROOM_LINE VARCHAR(200);
    EARTHQ_TYPE_LINE VARCHAR(200);
    CALC_TYPE_LINE VARCHAR(200);
    SET_TYPE_LINE VARCHAR(200);
    SET_ID_P1 NUMBER;
    DEMPF_LINE VARCHAR(200); 
    SELECTION_LINE_EK VARCHAR(1000);
    EK_ID NUMBER;
    BUILDING_P1 VARCHAR(200);
    EARTHQ_TYPE_P1 VARCHAR(200);
BEGIN
    SET_ID_P := NULL;
    FOUND_EK := 0;
    --
    IF LEV1_P is null THEN
        LEV1_LINE := ' AND ((LEV1 is null) OR (LEV1 = -200))';
    ELSE
        LEV1_LINE := ' AND (LEV1 = '||LEV1_P||')';
    END IF;
    --
    IF LEV2_P is null THEN
        LEV2_LINE := ' AND ((LEV2 is null) OR (LEV2 = 200))';
    ELSE
        LEV2_LINE := ' AND (LEV2 = '||LEV2_P||')';
    END IF;
    --
    IF PLANT_ID_P is null THEN
        PLANT_LINE := ' (PLANT_ID is null)';
    ELSE
        PLANT_LINE := ' (PLANT_ID = '||PLANT_ID_P||')';
    END IF;
    --    
    IF UNIT_ID_P is null THEN
        UNIT_LINE := ' AND (UNIT_ID is null)';
    ELSE
        UNIT_LINE := ' AND (UNIT_ID = '||UNIT_ID_P||')';
    END IF;
    --    
    IF BUILDING_P is null THEN
        BUILDING_LINE := ' AND (BUILDING is null)';
    ELSE
        BUILDING_P1 := REPLACE(BUILDING_P, '''', '''''');
        BUILDING_LINE := ' AND (BUILDING = '''||BUILDING_P1||''')';
    END IF;
    --    
    IF ROOM_P is null THEN
        ROOM_LINE := ' AND (ROOM is null)';
    ELSE
        ROOM_LINE := ' AND (ROOM = '''||ROOM_P||''')';
    END IF;
    --    
    IF EARTHQ_TYPE_P is null THEN
        EARTHQ_TYPE_LINE := ' AND (SPECTR_EARTHQ_TYPE = ''МРЗ'')';
    ELSE
        EARTHQ_TYPE_P1 := REPLACE(EARTHQ_TYPE_P, '''', '''''');
        EARTHQ_TYPE_LINE := ' AND (SPECTR_EARTHQ_TYPE = '''||EARTHQ_TYPE_P1||''')';
    END IF;
    --    
    IF CALC_TYPE_P is null THEN
        CALC_TYPE_LINE := ' AND (CALC_TYPE = ''ДЕТЕРМІНИСТИЧНИЙ'')';
    ELSE
        CALC_TYPE_LINE := ' AND (CALC_TYPE = '''||CALC_TYPE_P||''')';
    END IF;
    --    
    IF SET_TYPE_P is null THEN
        SET_TYPE_LINE := ' AND (SET_TYPE = ''ВИМОГИ'')';
    ELSE
        SET_TYPE_LINE := ' AND (SET_TYPE = '''||SET_TYPE_P||''')';
    END IF;
    --    
    IF DEMPF_P is null THEN
        DEMPF_LINE := null;
    ELSE
        DEMPF_LINE := ' AND (DEMPF = '||DEMPF_P||')';
    END IF;
    --
    SELECTION_LINE := 'SELECT ACCEL_SET_ID FROM SRTN_ACCEL_SET WHERE'||PLANT_LINE||UNIT_LINE;
    SELECTION_LINE := SELECTION_LINE || LEV1_LINE || LEV2_LINE;  -- FIXED: LEV1_P changed to LEV1_LINE
    SELECTION_LINE := SELECTION_LINE || BUILDING_LINE;
    SELECTION_LINE := SELECTION_LINE || ROOM_LINE || DEMPF_LINE;
    --
    OPEN c_ACCEL_SET FOR SELECTION_LINE;
    LOOP
        FETCH c_ACCEL_SET INTO SET_ID_P1;
        IF c_ACCEL_SET%NOTFOUND THEN
            DBMS_OUTPUT.PUT_LINE('----');
            EXIT;
        END IF;
        IF SET_ID_P is null THEN
            SET_ID_P := SET_ID_P1;
        END IF;
        SELECTION_LINE_EK := 'SELECT EK_ID FROM SRTN_EK_SEISM_DATA WHERE (ACCEL_SET_ID_MRZ = '||SET_ID_P1||') OR (ACCEL_SET_ID_PZ = '||SET_ID_P1||')';
        OPEN c_EK FOR SELECTION_LINE_EK;
        FETCH c_EK INTO EK_ID;
        IF NOT(c_EK%NOTFOUND) THEN  -- FIXED: was checking c_ACCEL_SET instead of c_EK
            FOUND_EK := 1;
            DBMS_OUTPUT.PUT_LINE(EK_ID);
        END IF;
        CLOSE c_EK;  -- ADDED: Missing close for c_EK cursor
    END LOOP;
    --
    CLOSE c_ACCEL_SET;
    DBMS_OUTPUT.PUT_LINE(SET_ID_P);
    --
END FIND_REQ_ACCEL_SET; 