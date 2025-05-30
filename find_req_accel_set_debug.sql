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
    SELECTION_LINE VARCHAR2(2000);
    LEV1_LINE VARCHAR2(200);
    LEV2_LINE VARCHAR2(200);
    PLANT_LINE VARCHAR2(200);
    UNIT_LINE VARCHAR2(200);
    BUILDING_LINE VARCHAR2(200);
    ROOM_LINE VARCHAR2(200);
    EARTHQ_TYPE_LINE VARCHAR2(200);
    CALC_TYPE_LINE VARCHAR2(200);
    SET_TYPE_LINE VARCHAR2(200);
    SET_ID_P1 NUMBER;
    DEMPF_LINE VARCHAR2(200); 
    SELECTION_LINE_EK VARCHAR2(1000);
    EK_ID NUMBER;
    BUILDING_P1 VARCHAR2(200);
    EARTHQ_TYPE_P1 VARCHAR2(200);
    RECORD_COUNT NUMBER := 0;
BEGIN
    SET_ID_P := NULL;
    FOUND_EK := 0;
    
    -- Debug: Log input parameters
    DBMS_OUTPUT.PUT_LINE('=== FIND_REQ_ACCEL_SET DEBUG ===');
    DBMS_OUTPUT.PUT_LINE('PLANT_ID_P: ' || NVL(TO_CHAR(PLANT_ID_P), 'NULL'));
    DBMS_OUTPUT.PUT_LINE('UNIT_ID_P: ' || NVL(TO_CHAR(UNIT_ID_P), 'NULL'));
    DBMS_OUTPUT.PUT_LINE('BUILDING_P: ' || NVL(BUILDING_P, 'NULL'));
    DBMS_OUTPUT.PUT_LINE('ROOM_P: ' || NVL(ROOM_P, 'NULL'));
    DBMS_OUTPUT.PUT_LINE('LEV1_P: ' || NVL(LEV1_P, 'NULL'));
    DBMS_OUTPUT.PUT_LINE('LEV2_P: ' || NVL(LEV2_P, 'NULL'));
    DBMS_OUTPUT.PUT_LINE('EARTHQ_TYPE_P: ' || NVL(EARTHQ_TYPE_P, 'NULL'));
    DBMS_OUTPUT.PUT_LINE('CALC_TYPE_P: ' || NVL(CALC_TYPE_P, 'NULL'));
    DBMS_OUTPUT.PUT_LINE('SET_TYPE_P: ' || NVL(SET_TYPE_P, 'NULL'));
    DBMS_OUTPUT.PUT_LINE('DEMPF_P: ' || NVL(DEMPF_P, 'NULL'));
    
    --
    IF LEV1_P is null THEN
        LEV1_LINE := ' AND ((LEV1 is null) OR (LEV1 = -200))';
    ELSE
        LEV1_LINE := ' AND (LEV1 = ' || LEV1_P || ')';
    END IF;
    --
    IF LEV2_P is null THEN
        LEV2_LINE := ' AND ((LEV2 is null) OR (LEV2 = 200))';
    ELSE
        LEV2_LINE := ' AND (LEV2 = ' || LEV2_P || ')';
    END IF;
    --
    IF PLANT_ID_P is null THEN
        PLANT_LINE := ' (PLANT_ID is null)';
    ELSE
        PLANT_LINE := ' (PLANT_ID = ' || PLANT_ID_P || ')';
    END IF;
    --    
    IF UNIT_ID_P is null THEN
        UNIT_LINE := ' AND (UNIT_ID is null)';
    ELSE
        UNIT_LINE := ' AND (UNIT_ID = ' || UNIT_ID_P || ')';
    END IF;
    --    
    IF BUILDING_P is null THEN
        BUILDING_LINE := ' AND (BUILDING is null)';
    ELSE
        BUILDING_P1 := REPLACE(BUILDING_P, '''', '''''');
        BUILDING_LINE := ' AND (BUILDING = ''' || BUILDING_P1 || ''')';
    END IF;
    --    
    IF ROOM_P is null THEN
        ROOM_LINE := ' AND (ROOM is null)';
    ELSE
        ROOM_LINE := ' AND (ROOM = ''' || ROOM_P || ''')';
    END IF;
    --    
    IF EARTHQ_TYPE_P is null THEN
        EARTHQ_TYPE_LINE := ' AND (SPECTR_EARTHQ_TYPE = ''МРЗ'')';
    ELSE
        EARTHQ_TYPE_P1 := REPLACE(EARTHQ_TYPE_P, '''', '''''');
        EARTHQ_TYPE_LINE := ' AND (SPECTR_EARTHQ_TYPE = ''' || EARTHQ_TYPE_P1 || ''')';
    END IF;
    --    
    IF CALC_TYPE_P is null THEN
        CALC_TYPE_LINE := ' AND (CALC_TYPE = ''ДЕТЕРМІНИСТИЧНИЙ'')';
    ELSE
        CALC_TYPE_LINE := ' AND (CALC_TYPE = ''' || CALC_TYPE_P || ''')';
    END IF;
    --    
    IF SET_TYPE_P is null THEN
        SET_TYPE_LINE := ' AND (SET_TYPE = ''ВИМОГИ'')';
    ELSE
        SET_TYPE_LINE := ' AND (SET_TYPE = ''' || SET_TYPE_P || ''')';
    END IF;
    --    
    IF DEMPF_P is null THEN
        DEMPF_LINE := '';  -- Changed from null to empty string to avoid concatenation issues
    ELSE
        DEMPF_LINE := ' AND (DEMPF = ' || DEMPF_P || ')';
    END IF;
    
    -- Build the selection line
    SELECTION_LINE := 'SELECT ACCEL_SET_ID FROM SRTN_ACCEL_SET WHERE' || PLANT_LINE || UNIT_LINE;
    SELECTION_LINE := SELECTION_LINE || LEV1_LINE || LEV2_LINE;
    SELECTION_LINE := SELECTION_LINE || BUILDING_LINE || ROOM_LINE;
    SELECTION_LINE := SELECTION_LINE || EARTHQ_TYPE_LINE || CALC_TYPE_LINE || SET_TYPE_LINE || DEMPF_LINE;
    
    -- Debug: Log the generated SQL
    DBMS_OUTPUT.PUT_LINE('Generated SQL:');
    DBMS_OUTPUT.PUT_LINE(SELECTION_LINE);
    
    -- First, let's count how many records match
    DECLARE
        COUNT_SQL VARCHAR2(2000);
        COUNT_RESULT NUMBER;
    BEGIN
        COUNT_SQL := REPLACE(SELECTION_LINE, 'SELECT ACCEL_SET_ID FROM', 'SELECT COUNT(*) FROM');
        DBMS_OUTPUT.PUT_LINE('Count SQL: ' || COUNT_SQL);
        
        EXECUTE IMMEDIATE COUNT_SQL INTO COUNT_RESULT;
        DBMS_OUTPUT.PUT_LINE('Found ' || COUNT_RESULT || ' matching records in SRTN_ACCEL_SET');
        RECORD_COUNT := COUNT_RESULT;
    END;
    
    -- If we found records, proceed with the original logic
    IF RECORD_COUNT > 0 THEN
        OPEN c_ACCEL_SET FOR SELECTION_LINE;
        LOOP
            FETCH c_ACCEL_SET INTO SET_ID_P1;
            IF c_ACCEL_SET%NOTFOUND THEN
                DBMS_OUTPUT.PUT_LINE('No more records in ACCEL_SET cursor');
                EXIT;
            END IF;
            
            DBMS_OUTPUT.PUT_LINE('Found ACCEL_SET_ID: ' || SET_ID_P1);
            
            IF SET_ID_P is null THEN
                SET_ID_P := SET_ID_P1;
            END IF;
            
            SELECTION_LINE_EK := 'SELECT EK_ID FROM SRTN_EK_SEISM_DATA WHERE (ACCEL_SET_ID_MRZ = ' || SET_ID_P1 || ') OR (ACCEL_SET_ID_PZ = ' || SET_ID_P1 || ')';
            DBMS_OUTPUT.PUT_LINE('EK Query: ' || SELECTION_LINE_EK);
            
            OPEN c_EK FOR SELECTION_LINE_EK;
            FETCH c_EK INTO EK_ID;
            IF NOT(c_EK%NOTFOUND) THEN
                FOUND_EK := 1;
                DBMS_OUTPUT.PUT_LINE('Found EK_ID: ' || EK_ID);
            ELSE
                DBMS_OUTPUT.PUT_LINE('No EK found for SET_ID: ' || SET_ID_P1);
            END IF;
            CLOSE c_EK;
        END LOOP;
        CLOSE c_ACCEL_SET;
    ELSE
        DBMS_OUTPUT.PUT_LINE('No matching records found in SRTN_ACCEL_SET');
    END IF;
    
    DBMS_OUTPUT.PUT_LINE('Final results:');
    DBMS_OUTPUT.PUT_LINE('SET_ID_P: ' || NVL(TO_CHAR(SET_ID_P), 'NULL'));
    DBMS_OUTPUT.PUT_LINE('FOUND_EK: ' || FOUND_EK);
    DBMS_OUTPUT.PUT_LINE('=== END DEBUG ===');
    
END FIND_REQ_ACCEL_SET; 